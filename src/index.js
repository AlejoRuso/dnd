import './styles/main.css';

class TrelloClone {
    constructor() {
        this.columns = ['todo', 'inProgress', 'done'];
        this.APP_VERSION = '1.5';
        this.state = this.loadState();
        this.addingCardColumn = null;
        this.draggedCard = null;
        this.sourceColumn = null;
        this.boundClickHandler = null;
        this.boundKeyHandler = null;
        this.boundDragStartHandler = this.handleDragStart.bind(this);
        this.boundDragEndHandler = this.handleDragEnd.bind(this);
        this.boundDragOverHandler = this.handleDragOver.bind(this);
        this.boundDropHandler = this.handleDrop.bind(this);
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
                { id: 1, text: 'Добро пожаловать' },
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
        // Удаляем старые обработчики
        if (this.boundClickHandler) {
            document.removeEventListener('click', this.boundClickHandler);
        }
        if (this.boundKeyHandler) {
            document.removeEventListener('keydown', this.boundKeyHandler);
        }
        
        // Назначаем новые обработчики
        this.boundClickHandler = this.handleClick.bind(this);
        this.boundKeyHandler = this.handleKeydown.bind(this);
        
        document.addEventListener('click', this.boundClickHandler);
        document.addEventListener('keydown', this.boundKeyHandler);

        // Используем делегирование событий для drag and drop
        this.setupDragAndDropDelegation();
    }

    setupDragAndDropDelegation() {
        const board = document.querySelector('.board');
        
        // Удаляем старые обработчики
        board.removeEventListener('dragstart', this.boundDragStartHandler);
        board.removeEventListener('dragend', this.boundDragEndHandler);
        board.removeEventListener('dragover', this.boundDragOverHandler);
        board.removeEventListener('drop', this.boundDropHandler);

        // Назначаем новые обработчики
        board.addEventListener('dragstart', this.boundDragStartHandler);
        board.addEventListener('dragend', this.boundDragEndHandler);
        board.addEventListener('dragover', this.boundDragOverHandler);
        board.addEventListener('drop', this.boundDropHandler);
    }

    handleDragStart(e) {
        if (e.target.classList.contains('card')) {
            const card = e.target;
            this.draggedCard = card;
            this.sourceColumn = card.closest('.cards-container').dataset.column;
            setTimeout(() => card.classList.add('dragging'), 0);
            e.dataTransfer.effectAllowed = 'move';
            
            document.body.style.cursor = 'grabbing';
        }
    }

    handleDragEnd(e) {
        if (this.draggedCard) {
            this.draggedCard.classList.remove('dragging');
        }
        document.body.style.cursor = 'default';
        
        document.querySelectorAll('.card-ghost').forEach(el => el.remove());
        this.draggedCard = null;
        this.sourceColumn = null;
    }

    handleDragOver(e) {
        e.preventDefault();
        if (!this.draggedCard) return;

        const container = e.target.closest('.cards-container');
        if (!container) return;

        const afterElement = this.getDragAfterElement(container, e.clientY);
        
        container.querySelectorAll('.card-ghost').forEach(el => el.remove());
        
        if (container.children.length === 0) {
            container.appendChild(this.createGhostElement());
        } else if (afterElement) {
            container.insertBefore(this.createGhostElement(), afterElement);
        } else {
            container.appendChild(this.createGhostElement());
        }
    }

    handleDrop(e) {
        e.preventDefault();
        if (!this.draggedCard) return;

        const container = e.target.closest('.cards-container');
        if (!container) return;

        const afterElement = this.getDragAfterElement(container, e.clientY);
        const targetColumn = container.dataset.column;
        
        const cardId = parseInt(this.draggedCard.dataset.cardId, 10);
        const cardText = this.draggedCard.querySelector('.card-text').textContent;
        
        this.removeCardFromState(cardId);
        this.addCardToState(cardId, cardText, targetColumn, afterElement);
        
        this.saveState();
        this.renderBoard();
        this.setupEventListeners();
        
        document.querySelectorAll('.card-ghost').forEach(el => el.remove());
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
                if (textarea) {
                    textarea.focus();
                }
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
        if (!form) {
            return;
        }

        const textarea = form.querySelector('.card-input');
        if (!textarea) {
            return;
        }

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
        const parsedCardId = parseInt(cardId, 10);
        for (const column of this.columns) {
            const index = this.state[column].findIndex(card => card.id === parsedCardId);
            if (index !== -1) {
                this.state[column].splice(index, 1);
                break;
            }
        }
        this.saveState();
        this.renderBoard();
        this.setupEventListeners();
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.card:not(.dragging)')];
        
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

    removeCardFromState(cardId) {
        for (const column of this.columns) {
            this.state[column] = this.state[column].filter(card => card.id !== cardId);
        }
    }

    addCardToState(cardId, text, targetColumn, afterElement) {
        const newCard = { id: cardId, text: text };
        
        if (afterElement) {
            const afterCardId = parseInt(afterElement.dataset.cardId, 10);
            const afterIndex = this.state[targetColumn].findIndex(card => card.id === afterCardId);
            this.state[targetColumn].splice(afterIndex, 0, newCard);
        } else {
            this.state[targetColumn].push(newCard);
        }
    }
}

new TrelloClone();