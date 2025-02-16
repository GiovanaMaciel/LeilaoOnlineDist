from gevent import monkey
monkey.patch_all()

import werkzeug.urls
if not hasattr(werkzeug.urls, 'url_quote'):
    from urllib.parse import quote as url_quote
    werkzeug.urls.url_quote = url_quote

from flask import Flask, request, jsonify, Response, render_template
import redis
import json
import time
from datetime import datetime

app = Flask(__name__, static_folder='static', template_folder='templates')
redis_client = redis.Redis(host='redis', port=6379, decode_responses=True)

def get_new_auction_id():
    return redis_client.incr("auction:id")

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/create-auction', methods=['POST'])
def create_auction():
    data = request.get_json()
    title = data.get("title", "").strip()
    description = data.get("description", "").strip()
    starting_price = data.get("starting_price")
    end_time_str = data.get("end_time")

    # Validação de data: deve ser no futuro
    try:
        end_time_dt = datetime.strptime(end_time_str, "%Y-%m-%dT%H:%M")
    except (ValueError, TypeError):
        return jsonify({"error": "Formato de data inválido"}), 400

    if end_time_dt <= datetime.now():
        return jsonify({"error": "A data de término deve ser no futuro"}), 400

    # Verifica se já existe um leilão com o mesmo título e descrição
    existing_ids = redis_client.smembers("auctions")
    for eid in existing_ids:
        auction = redis_client.hgetall(f"auction:{eid}")
        if auction:
            if auction.get("title", "").strip().lower() == title.lower() and auction.get("description", "").strip().lower() == description.lower():
                return jsonify({"error": "Já existe um leilão com o mesmo título e descrição"}), 400

    auction_id = get_new_auction_id()
    auction_key = f"auction:{auction_id}"
    auction_data = {
        "id": auction_id,
        "title": title,
        "description": description,
        "starting_price": starting_price,
        "current_bid": starting_price,
        "end_time": end_time_str,
        "active": "true"
    }
    redis_client.hmset(auction_key, auction_data)
    redis_client.sadd("auctions", auction_id)
    return jsonify({"auction_id": auction_id}), 201

@app.route('/view-auctions', methods=['GET'])
def view_auctions():
    auction_ids = redis_client.smembers("auctions")
    auctions = []
    for aid in auction_ids:
        auction = redis_client.hgetall(f"auction:{aid}")
        if auction:
            auctions.append(auction)
    return jsonify(auctions)

@app.route('/place-bid', methods=['POST'])
def place_bid():
    data = request.get_json()
    auction_id = data.get("auction_id")
    bid_value = float(data.get("bid_value"))
    bidder = data.get("bidder")
    auction_key = f"auction:{auction_id}"
    auction = redis_client.hgetall(auction_key)
    if not auction:
        return jsonify({"error": "Auction not found"}), 404

    # Verifica se o leilão já encerrou pela data
    try:
        end_time_dt = datetime.strptime(auction.get("end_time"), "%Y-%m-%dT%H:%M")
    except (ValueError, TypeError):
        return jsonify({"error": "Data de término inválida no leilão"}), 400

    if datetime.now() >= end_time_dt:
        redis_client.hset(auction_key, "active", "false")
        return jsonify({"error": "Leilão encerrado. Não é possível enviar lances."}), 400

    if auction.get("active") != "true":
        return jsonify({"error": "Leilão encerrado. Não é possível enviar lances."}), 400

    current_bid = float(auction.get("current_bid"))
    if bid_value <= current_bid:
        return jsonify({"error": "O lance deve ser maior que o lance atual"}), 400

    redis_client.hset(auction_key, "current_bid", bid_value)
    bid_entry = json.dumps({
        "bidder": bidder,
        "bid_value": bid_value,
        "timestamp": time.time()
    })
    redis_client.zadd(f"auction:{auction_id}:bids", {bid_entry: bid_value})
    update_message = json.dumps({
        "auction_id": auction_id,
        "bidder": bidder,
        "bid_value": bid_value
    })
    redis_client.publish(f"auction:{auction_id}:updates", update_message)
    return jsonify({"message": "Lance efetuado com sucesso"})

@app.route('/auction/<auction_id>', methods=['GET'])
def auction_details(auction_id):
    auction_key = f"auction:{auction_id}"
    auction = redis_client.hgetall(auction_key)
    if not auction:
        return jsonify({"error": "Auction not found"}), 404
    bids = redis_client.zrevrange(f"auction:{auction_id}:bids", 0, -1, withscores=True)
    bid_list = []
    for bid, score in bids:
        bid_data = json.loads(bid)
        bid_data["bid_value"] = score
        bid_list.append(bid_data)
    auction["bids"] = bid_list
    return jsonify(auction)

@app.route('/auction/<auction_id>/stream')
def auction_stream(auction_id):
    def event_stream():
        pubsub = redis_client.pubsub()
        pubsub.subscribe(f"auction:{auction_id}:updates")
        heartbeat_interval = 15  # segundos
        last_heartbeat = time.time()
        try:
            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message:
                    yield f"data: {message['data']}\n\n"
                if time.time() - last_heartbeat > heartbeat_interval:
                    yield "data: heartbeat\n\n"
                    last_heartbeat = time.time()
                from gevent import sleep
                sleep(0.1)
        except GeneratorExit:
            pubsub.close()
    return Response(event_stream(), mimetype="text/event-stream")

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
