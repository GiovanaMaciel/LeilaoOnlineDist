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

    // Aplica o filtro quando o botão de filtrar é clicado
    document.getElementById('apply-filter').addEventListener('click', loadAuctions);

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
        const image_url = document.getElementById('image_url').value; // Campo para imagem
    
        const res = await fetch('/create-auction', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, starting_price, end_time, image_url })
        });
        const data = await res.json();
        if(data.error) {
            showMessage(data.error, "danger");
        } else {
            showMessage('Leilão criado com ID: ' + data.auction_id, "success");
            loadAuctions();
            auctionForm.reset();  // Limpa os campos do formulário
        }
    });
    

    let auctionCache = {};

    async function loadAuctions() {
        const res = await fetch('/view-auctions');
        let auctions = await res.json();
        const now = new Date();
    
        // Ordena: leilões ativos primeiro e, em seguida, os encerrados.
        // Em caso de empate na data, utiliza o ID como critério secundário.
        auctions.sort((a, b) => {
            const aDate = new Date(a.end_time);
            const bDate = new Date(b.end_time);
            const aClosed = now >= aDate;
            const bClosed = now >= bDate;
    
            // Leilões encerrados vão para o final
            if (aClosed && !bClosed) return 1;
            if (!aClosed && bClosed) return -1;
    
            // Se ambos estão ativos ou ambos encerrados, ordena pela data de encerramento
            if (aDate.getTime() !== bDate.getTime()) {
                return aDate - bDate;
            } else {
                // Critério secundário: comparar o ID (convertendo para número)
                return parseInt(a.id) - parseInt(b.id);
            }
        });
    
        auctionsList.innerHTML = '';
        auctions.forEach(auction => {
            const li = document.createElement('li');
            li.className = 'list-group-item';
            li.id = `auction-${auction.id}`;
    
            // Criação do círculo de status
            const statusCircle = document.createElement('span');
            statusCircle.classList.add('status-circle');
    
            const endDate = new Date(auction.end_time);
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
            const auctionDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
    
            // Define o status com base na data
            if (now >= endDate) {
                statusCircle.classList.add('closed');
            } else if (auctionDate.getTime() === today.getTime() || auctionDate.getTime() === tomorrow.getTime()) {
                statusCircle.classList.add('ending-soon');
            } else {
                statusCircle.classList.add('active');
            }
    
            // Verifica se há modificações comparando com o cache
            const prevAuction = auctionCache[auction.id];
            let updated = false;
            if (!prevAuction) {
                updated = true;
            } else if (prevAuction.current_bid !== auction.current_bid || prevAuction.active !== auction.active) {
                updated = true;
            }
            if (updated) {
                statusCircle.classList.add('pulse');
            }
    
            // Aplica filtro
            const filterStatus = document.getElementById('filter-status').value;
            const filterKeyword = document.getElementById('filter-keyword').value.toLowerCase();
            let matchesFilter = true;
            if (filterStatus !== "all") {
                if (filterStatus === "active" && now >= endDate) matchesFilter = false;
                if (filterStatus === "closed" && now < endDate) matchesFilter = false;
                if (filterStatus === "ending-soon") {
                    const isEndingSoon = (auctionDate.getTime() === today.getTime() || auctionDate.getTime() === tomorrow.getTime());
                    if (!isEndingSoon) matchesFilter = false;
                }
            }
            if (filterKeyword) {
                const titleText = auction.title.toLowerCase();
                const descriptionText = auction.description.toLowerCase();
                if (!titleText.includes(filterKeyword) && !descriptionText.includes(filterKeyword)) {
                    matchesFilter = false;
                }
            }
            if (!matchesFilter) return;
    
            // Atualiza cache
            auctionCache[auction.id] = auction;
    
            li.appendChild(statusCircle);
            const text = document.createTextNode(`ID: ${auction.id} - ${auction.title} - Lance Atual: ${auction.current_bid}`);
            li.appendChild(text);
    
            li.addEventListener('click', () => {
                statusCircle.classList.remove('pulse');
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
    
        // Processa a imagem do produto, se houver
        let productImageHTML = "";
        if (auction.image_url && auction.image_url.trim() !== "") {
            let productImage = auction.image_url;
            if (!productImage.startsWith("http") && !productImage.startsWith("/static/")) {
                productImage = "/static/" + productImage;
            }
            productImageHTML = `<img src="${productImage}" alt="Imagem do Produto"
                                 class="img-fluid mb-3" style="max-height:300px;"
                                 onerror="this.style.display='none';">`;
        }
    
        // Determina se o leilão está encerrado com base na data de término
        const auctionEnd = new Date(auction.end_time);
        const now = new Date();
        const auctionExpired = now >= auctionEnd;
    
        // Atualiza o container de detalhes do leilão
        auctionDetailsContainer.innerHTML = `
            <h4>${auction.title}</h4>
            ${productImageHTML}
            <p>${auction.description}</p>
            <p><strong>Lance Atual:</strong> ${auction.current_bid}</p>
            <p><strong>Encerramento:</strong> ${auctionEnd.toLocaleString()}</p>
        `;
    
        // Exibe a seção de lances e bloqueia os campos se o leilão estiver encerrado
        bidSection.style.display = 'block';
        if (auctionExpired) {
            Array.from(bidForm.querySelectorAll("input")).forEach(input => input.disabled = true);
            bidForm.querySelector("button").disabled = true;
            auctionClosedMessageDiv.textContent = "Leilão encerrado. Não é possível enviar lances.";
            // Não é necessário subscribir ao canal SSE se o leilão já está encerrado
            if (eventSource) {
                eventSource.close();
            }
        } else {
            Array.from(bidForm.querySelectorAll("input")).forEach(input => input.disabled = false);
            bidForm.querySelector("button").disabled = false;
            auctionClosedMessageDiv.textContent = "";
            subscribeAuction(auctionId);
        }
    
        // Configura o envio de lances
        bidForm.onsubmit = async (e) => {
            e.preventDefault();
            // Se o leilão já estiver encerrado, não envia o lance
            if (auctionExpired) return;
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
                if (data.error.includes("encerrado")) {
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

    // Atualiza os leilões a cada 5 segundos
    setInterval(loadAuctions, 2000);
});
