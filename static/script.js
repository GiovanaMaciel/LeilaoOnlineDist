document.addEventListener('DOMContentLoaded', () => {
    const auctionForm = document.getElementById('auctionForm');
    const auctionsList = document.getElementById('auctionsList');
    const auctionDetailsContainer = document.getElementById('auctionDetailsContainer');
    const bidForm = document.getElementById('bidForm');
    const bidSection = document.getElementById('bid-section');
    const bidsList = document.getElementById('bidsList');
    const messageDiv = document.getElementById('message');
    const bidMessageDiv = document.getElementById('bidMessage');
    const auctionClosedMessageDiv = document.getElementById('auctionClosedMessage');
    let eventSource = null;

    function showMessage(text, type = "success") {
        messageDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${text}</div>`;
        setTimeout(() => {
            messageDiv.innerHTML = "";
        }, 5000);
    }

    function showBidMessage(text, type = "success") {
        bidMessageDiv.innerHTML = `<div class="alert alert-${type}" role="alert">${text}</div>`;
        setTimeout(() => {
            bidMessageDiv.innerHTML = "";
        }, 5000);
    }

    auctionForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('title').value;
        const description = document.getElementById('description').value;
        const starting_price = document.getElementById('starting_price').value;
        const end_time = document.getElementById('end_time').value;

        const res = await fetch('/create-auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, starting_price, end_time })
        });
        const data = await res.json();
        if(data.error) {
            showMessage(data.error, "danger");
        } else {
            showMessage('Leilão criado com ID: ' + data.auction_id, "success");
            loadAuctions();
        }
    });

    async function loadAuctions() {
        const res = await fetch('/view-auctions');
        const auctions = await res.json();
        auctionsList.innerHTML = '';
        auctions.forEach(auction => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.textContent = `ID: ${auction.id} - ${auction.title} - Lance Atual: ${auction.current_bid}`;
            li.addEventListener('click', () => {
                viewAuction(auction.id);
            });
            auctionsList.appendChild(li);
        });
    }

    async function viewAuction(auctionId) {
        if (eventSource) {
            eventSource.close();
        }
        const res = await fetch(`/auction/${auctionId}`);
        const auction = await res.json();
        auctionDetailsContainer.innerHTML = `
          <h4>${auction.title}</h4>
          <p>${auction.description}</p>
          <p><strong>Lance Atual:</strong> ${auction.current_bid}</p>
          <p><strong>Encerramento:</strong> ${new Date(auction.end_time).toLocaleString()}</p>
        `;
        bidsList.innerHTML = '';
        if (auction.bids) {
            auction.bids.forEach(bid => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `${bid.bidder}: ${bid.bid_value} (em ${new Date(bid.timestamp * 1000).toLocaleString()})`;
                bidsList.appendChild(li);
            });
        }
        // Se o leilão estiver encerrado, desabilita os campos e exibe mensagem fixa
        if (auction.active !== "true") {
            bidSection.style.display = 'block';
            Array.from(bidForm.querySelectorAll("input")).forEach(input => input.disabled = true);
            bidForm.querySelector("button").disabled = true;
            auctionClosedMessageDiv.textContent = "Leilão encerrado. Não é possível enviar lances.";
        } else {
            bidSection.style.display = 'block';
            // Certifique-se de que os inputs estejam habilitados para leilões ativos
            Array.from(bidForm.querySelectorAll("input")).forEach(input => input.disabled = false);
            bidForm.querySelector("button").disabled = false;
            auctionClosedMessageDiv.textContent = "";
        }
        subscribeAuction(auctionId);
        
        bidForm.onsubmit = async (e) => {
            e.preventDefault();
            const bid_value = document.getElementById('bid_value').value;
            const bidder = document.getElementById('bidder').value;
            const res = await fetch('/place-bid', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ auction_id: auctionId, bid_value, bidder })
            });
            const data = await res.json();
            if (data.error) {
                showBidMessage(data.error, "danger");
                if(data.error.includes("encerrado")) {
                    Array.from(bidForm.querySelectorAll("input")).forEach(input => input.disabled = true);
                    bidForm.querySelector("button").disabled = true;
                    auctionClosedMessageDiv.textContent = "Leilão encerrado. Não é possível enviar lances.";
                }
            } else {
                showBidMessage('Lance efetuado com sucesso', "success");
            }
            document.getElementById('bid_value').value = '';
        }
    }

    function subscribeAuction(auctionId) {
        eventSource = new EventSource(`/auction/${auctionId}/stream`);
        eventSource.onmessage = function(event) {
            if (event.data === "heartbeat") return;
            try {
                const data = JSON.parse(event.data);
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.textContent = `${data.bidder}: ${data.bid_value}`;
                bidsList.appendChild(li);
            } catch (error) {
                console.error("Erro ao processar mensagem SSE:", error);
            }
        };
    }

    window.addEventListener('beforeunload', function() {
        if (eventSource) {
            eventSource.close();
        }
    });

    loadAuctions();
});
