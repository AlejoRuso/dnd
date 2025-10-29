import './styles/main.css';

class TrelloClone {
    constructor() {
        this.columns = ['todo', 'inProgress', 'done'];
        this.APP_VERSION = '1.2';
        this.state = this.loadState();
        this.addingCardColumn = null;
        this.init();
    }

    init() {
        this.renderBoard();
        this.setupEventListeners();
    }

    loadState() {
        const savedVersion = localStorage.getItem('trelloVersion');
        const saved = localStorage.getItem('trelloState');
        
        if (savedVersion !== this.APP_VERSION) {
            localStorage.removeItem('trelloState');
            localStorage.setItem('trelloVersion', this.APP_VERSION);
            return this.getInitialState();
        }
        
        if (saved) {
            return JSON.parse(saved);
        }
        
        return this.getInitialState();
    }

    getInitialState() {
        return {
            todo: [
                { id: 1, text: 'Добро пожаловать!' },
                { id: 2, text: 'Это карточка 1' },
                { id: 3, text: 'Это карточка 2' }
            ],
            inProgress: [
                { id: 4, text: 'Это карточка 3' },
                { id: 5, text: 'Это карточка 4' },
                { id: 6, text: 'Это карточка 5' }
            ],
            done: [
                { id: 7, text: 'Это карточка 6' },
                { id: 8, text: 'Это карточка 7' },
                { id: 9, text: 'Это карточка 8' }
            ]
        };
    }

    saveState() {
        localStorage.setItem('trelloState', JSON.stringify(this.state));
        localStorage.setItem('trelloVersion', this.APP_VERSION);
    }

    renderBoard() {
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="board">
                ${this.columns.map(column => this.renderColumn(column)).join('')}
            </div>
        `;
    }

    renderColumn(columnId) {
        const columnTitles = {
            todo: 'TODO',
            inProgress: 'IN PROGRESS',
            done: 'DONE'
        };

        const isAdding = this.addingCardColumn === columnId;

        return `
            <div class="column" data-column="${columnId}">
                <h2>${columnTitles[columnId]}</h2>
                <div class="cards-container" data-column="${columnId}">
                    ${this.state[columnId].map(card => this.renderCard(card)).join('')}
                    <div class="drop-zone-end" data-column="${columnId}"></div>
                </div>
                ${isAdding ? this.renderAddCardForm(columnId) : this.renderAddCardButton(columnId)}
            </div>
        `;
    }

    renderCard(card) {
        return `
            <div class="card" draggable="true" data-card-id="${card.id}">
                <span class="card-text">${card.text}</span>
                <span class="delete-card" data-card-id="${card.id}">×</span>
            </div>
        `;
    }

    renderAddCardButton(columnId) {
        return `
            <button class="add-card-btn" data-column="${columnId}">
                + Добавить карточку
            </button>
        `;
    }

    renderAddCardForm(columnId) {
        return `
            <div class="add-card-form" data-column="${columnId}">
                <textarea class="card-input" placeholder="Введите заголовок для этой карточки..." rows="3"></textarea>
                <div class="add-card-actions">
                    <button class="add-card-submit">Добавить карточку</button>
                    <span class="add-card-cancel">✕</span>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        document.removeEventListener('click', this.boundClickHandler);
        document.removeEventListener('keydown', this.boundKeyHandler);
        
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundKeyHandler = this.handleKeydown.bind(this);
        
        document.addEventListener('click', this.boundClickHandler);
        document.addEventListener('keydown', this.boundKeyHandler);

        this.setupDragAndDrop();
    }

    handleClick(e) {
        if (e.target.classList.contains('add-card-btn')) {
            this.handleShowAddCardForm(e.target.dataset.column);
            return;
        }
        
        if (e.target.classList.contains('delete-card')) {
            this.handleDeleteCard(e.target.dataset.cardId);
            return;
        }

        if (e.target.classList.contains('add-card-submit')) {
            const form = e.target.closest('.add-card-form');
            if (form) {
                this.handleAddCardSubmit(form.dataset.column);
            }
            return;
        }

        if (e.target.classList.contains('add-card-cancel')) {
            this.handleCancelAddCard();
        }
    }

    handleKeydown(e) {
        if (e.key === 'Escape' && this.addingCardColumn) {
            this.handleCancelAddCard();
        }
        
        if (e.key === 'Enter' && e.ctrlKey && this.addingCardColumn) {
            const form = document.querySelector('.add-card-form');
            if (form) {
                this.handleAddCardSubmit(form.dataset.column);
            }
        }
    }

    handleShowAddCardForm(columnId) {
        this.addingCardColumn = columnId;
        this.renderBoard();
        
        setTimeout(() => {
            const form = document.querySelector('.add-card-form');
            if (form) {
                const textarea = form.querySelector('.card-input');
                if (textarea) textarea.focus();
            }
        }, 0);
    }

    handleCancelAddCard() {
        this.addingCardColumn = null;
        this.renderBoard();
        this.setupEventListeners();
    }

    handleAddCardSubmit(columnId) {
        const form = document.querySelector(`.add-card-form[data-column="${columnId}"]`);
        if (!form) return;

        const textarea = form.querySelector('.card-input');
        if (!textarea) return;

        const text = textarea.value.trim();
        
        if (text) {
            const newCard = {
                id: Date.now(),
                text: text
            };
            
            this.state[columnId].push(newCard);
            this.saveState();
            this.addingCardColumn = null;
            this.renderBoard();
            this.setupEventListeners();
        } else {
            this.handleCancelAddCard();
        }
    }

    handleDeleteCard(cardId) {
        cardId = parseInt(cardId);
        for (let column of this.columns) {
            const index = this.state[column].findIndex(card => card.id === cardId);
            if (index !== -1) {
                this.state[column].splice(index, 1);
                break;
            }
        }
        this.saveState();
        this.renderBoard();
        this.setupEventListeners();
    }

    setupDragAndDrop() {
        const cards = document.querySelectorAll('.card');
        const containers = document.querySelectorAll('.cards-container');
        const dropZones = document.querySelectorAll('.drop-zone-end');
        
        let draggedCard = null;
        let sourceColumn = null;

        cards.forEach(card => {
            card.addEventListener('dragstart', (e) => {
                draggedCard = card;
                sourceColumn = card.closest('.cards-container').dataset.column;
                setTimeout(() => card.classList.add('dragging'), 0);
                e.dataTransfer.effectAllowed = 'move';
                
                document.body.style.cursor = 'grabbing';
            });

            card.addEventListener('dragend', (e) => {
                if (draggedCard) {
                    draggedCard.classList.remove('dragging');
                }
                document.body.style.cursor = 'default';
                
                // Убираем все плейсхолдеры
                document.querySelectorAll('.card-ghost').forEach(el => el.remove());
                document.querySelectorAll('.drop-zone-end').forEach(el => {
                    el.style.backgroundColor = '';
                    el.style.borderColor = '';
                });
                
                draggedCard = null;
                sourceColumn = null;
            });
        });

        // Обработка перетаскивания над карточками
        containers.forEach(container => {
            container.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedCard) return;

                const afterElement = this.getDragAfterElement(container, e.clientY);
                const dropZone = container.querySelector('.drop-zone-end');
                
                // Убираем подсветку с дроп-зоны
                dropZone.style.backgroundColor = '';
                dropZone.style.borderColor = '';
                
                // Убираем старые плейсхолдеры
                container.querySelectorAll('.card-ghost').forEach(el => el.remove());
                
                // Вставляем плейсхолдер в нужную позицию
                if (afterElement) {
                    container.insertBefore(this.createGhostElement(), afterElement);
                }
            });

            container.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedCard) return;

                const afterElement = this.getDragAfterElement(container, e.clientY);
                const targetColumn = container.dataset.column;
                
                const cardId = parseInt(draggedCard.dataset.cardId);
                const cardText = draggedCard.querySelector('.card-text').textContent;
                
                // Удаляем карточку из исходной колонки
                this.state[sourceColumn] = this.state[sourceColumn].filter(card => card.id !== cardId);
                
                // Добавляем карточку в целевую колонку
                const newCard = { id: cardId, text: cardText };
                
                if (afterElement && !afterElement.classList.contains('drop-zone-end')) {
                    const afterCardId = parseInt(afterElement.dataset.cardId);
                    const afterIndex = this.state[targetColumn].findIndex(card => card.id === afterCardId);
                    this.state[targetColumn].splice(afterIndex, 0, newCard);
                } else {
                    // Если afterElement - это дроп-зона или null, добавляем в конец
                    this.state[targetColumn].push(newCard);
                }
                
                this.saveState();
                this.renderBoard();
                this.setupEventListeners();
            });
        });

        // Обработка перетаскивания над дроп-зонами (в конец списка)
        dropZones.forEach(dropZone => {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                if (!draggedCard) return;

                const container = dropZone.parentElement;
                const cards = container.querySelectorAll('.card:not(.dragging)');
                
                // Убираем все плейсхолдеры
                container.querySelectorAll('.card-ghost').forEach(el => el.remove());
                
                // Подсвечиваем дроп-зону
                dropZone.style.backgroundColor = 'rgba(9,30,66,.08)';
                dropZone.style.borderColor = 'rgba(9,30,66,.4)';
                
                // Если есть карточки, вставляем плейсхолдер перед дроп-зоной
                if (cards.length > 0) {
                    const lastCard = cards[cards.length - 1];
                    container.insertBefore(this.createGhostElement(), dropZone);
                }
            });

            dropZone.addEventListener('dragleave', (e) => {
                // Сбрасываем подсветку при уходе с дроп-зоны
                if (!dropZone.contains(e.relatedTarget)) {
                    dropZone.style.backgroundColor = '';
                    dropZone.style.borderColor = '';
                }
            });

            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                if (!draggedCard) return;

                const targetColumn = dropZone.dataset.column;
                const cardId = parseInt(draggedCard.dataset.cardId);
                const cardText = draggedCard.querySelector('.card-text').textContent;
                
                // Удаляем карточку из исходной колонки
                this.state[sourceColumn] = this.state[sourceColumn].filter(card => card.id !== cardId);
                
                // Добавляем карточку в конец целевой колонки
                this.state[targetColumn].push({ id: cardId, text: cardText });
                
                this.saveState();
                this.renderBoard();
                this.setupEventListeners();
            });
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging), .drop-zone-end')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    createGhostElement() {
        const ghost = document.createElement('div');
        ghost.className = 'card-ghost';
        return ghost;
    }
}

new TrelloClone();