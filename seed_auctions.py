import requests
import datetime
import time

# URL do endpoint para criar leilões (ajuste se necessário)
CREATE_AUCTION_URL = "http://localhost:5000/create-auction"

# Função para criar um leilão com os dados fornecidos
def create_auction(title, description, starting_price, end_time, image_url=""):
    payload = {
        "title": title,
        "description": description,
        "starting_price": starting_price,
        "end_time": end_time.strftime("%Y-%m-%dT%H:%M"),
        "image_url": image_url
    }
    try:
        response = requests.post(CREATE_AUCTION_URL, json=payload)
        if response.status_code == 201:
            data = response.json()
            print(f"Leilão '{title}' criado com sucesso: ID {data.get('auction_id')}")
        else:
            error_msg = response.json().get("error")
            print(f"Falha ao criar leilão '{title}': {error_msg}")
    except Exception as e:
        print(f"Erro ao conectar com o sistema para '{title}': {e}")

def main():
    agora = datetime.datetime.now()

    # 1. Leilões já encerrados (datas no passado)
    print("Inserindo leilões já encerrados...")
    for i in range(1, 6):
        # Encerrados: 10 a 50 minutos no passado (incremento de 10 minutos)
        end_time = agora - datetime.timedelta(minutes=10 * i)
        create_auction(
            title=f"Leilão Encerrado {i}",
            description=f"Descrição do leilão encerrado {i}",
            starting_price=100 * i,
            end_time=end_time,
            image_url=""  # Sem imagem
        )
        time.sleep(0.5)

    # 2. Leilões que irão encerrar em breve (nos próximos 10 minutos)
    print("\nInserindo leilões que irão encerrar em breve...")
    for i in range(1, 6):
        # Encerram em breve: 5 a 9 minutos no futuro
        end_time = agora + datetime.timedelta(minutes=4 + i)
        create_auction(
            title=f"Leilão Encerrando em Breve {i}",
            description=f"Descrição do leilão encerrando em breve {i}",
            starting_price=200 * i,
            end_time=end_time,
            image_url="https://via.placeholder.com/150"
        )
        time.sleep(0.5)

    # 3. Leilões que irão encerrar daqui 1 semana
    print("\nInserindo leilões que irão encerrar daqui 1 semana...")
    for i in range(1, 6):
        # Encerram em 1 semana: adiciona 7 dias à data atual
        end_time = agora + datetime.timedelta(days=7)
        create_auction(
            title=f"Leilão Encerrando em 1 Semana {i}",
            description=f"Descrição do leilão que encerra em 1 semana {i}",
            starting_price=300 * i,
            end_time=end_time,
            image_url="https://via.placeholder.com/200"
        )
        time.sleep(0.5)

if __name__ == '__main__':
    main()
