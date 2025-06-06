// Terminal JavaScript - Basic Implementation

class Terminal {
    constructor() {
        this.output = document.getElementById('terminal-output');
        this.input = document.getElementById('terminal-input');
        this.cursor = document.getElementById('cursor');
        this.timeDisplay = document.getElementById('terminal-time');
        
        this.commandHistory = [];
        this.historyIndex = 0;
        this.currentDirectory = '~';
        
        this.init();
    }
    
    init() {
        // Set up event listeners
        this.input.addEventListener('keydown', (e) => this.handleKeyPress(e));
        this.input.addEventListener('input', () => this.updateCursorPosition());
        
        // Keep focus on input
        document.addEventListener('click', () => this.input.focus());
        
        // Start time display
        this.startClock();
        
        // Initial cursor position
        this.updateCursorPosition();
    }
    
    handleKeyPress(e) {
        switch(e.key) {
            case 'Enter':
                e.preventDefault();
                this.executeCommand();
                break;
            case 'ArrowUp':
                e.preventDefault();
                this.navigateHistory('up');
                break;
            case 'ArrowDown':
                e.preventDefault();
                this.navigateHistory('down');
                break;
            case 'Tab':
                e.preventDefault();
                // TODO: Implement autocomplete
                break;
        }
    }
    
    executeCommand() {
        const command = this.input.value.trim();
        if (!command) return;
        
        // Add command to history
        this.commandHistory.push(command);
        this.historyIndex = this.commandHistory.length;
        
        // Display command in output
        this.appendOutput(`⋅.˳˳.⋅ visitor@inwaves.io ${this.currentDirectory}$ ${command}`, 'command-line');
        
        // Process command
        const output = this.processCommand(command);
        if (output) {
            this.appendOutput(output.text, output.type);
        }
        
        // Clear input
        this.input.value = '';
        this.updateCursorPosition();
        
        // Scroll to bottom
        this.scrollToBottom();
    }
    
    processCommand(command) {
        const [cmd, ...args] = command.split(' ');
        
        switch(cmd) {
            case 'help':
                return {
                    text: `Available commands:
    
  Navigation:
    about          - Display the About page
    now           - Show current activities  
    cool-things   - Display the Cool Things page
    presentations - List presentations
    categories    - Browse by categories
    home          - Return to main page
    
  Content:
    ls [dir]      - List files/directories
    cat <file>    - Display file content
    cd <dir>      - Change directory
    pwd           - Print working directory
    
  Utility:
    help          - Show this help message
    clear         - Clear terminal screen
    history       - Show command history
    
  Type 'man <command>' for detailed information about a command.`,
                    type: 'output-info'
                };
                
            case 'clear':
                this.clearOutput();
                return null;
                
            case 'pwd':
                return {
                    text: `/home/visitor/inwaves/${this.currentDirectory === '~' ? '' : this.currentDirectory}`,
                    type: 'output-line'
                };
                
            case 'history':
                return {
                    text: this.commandHistory.map((cmd, i) => `  ${i + 1}  ${cmd}`).join('\n'),
                    type: 'output-line'
                };
                
            case 'ls':
                if (this.currentDirectory === '~') {
                    return {
                        text: 'about  cool-things  now  presentations/  research/  categories/',
                        type: 'output-line'
                    };
                }
                return {
                    text: 'No files in current directory',
                    type: 'output-warning'
                };
                
            case 'about':
            case 'now':
            case 'cool-things':
            case 'presentations':
            case 'categories':
            case 'home':
                return {
                    text: `[Loading ${cmd} page... This feature will be implemented with Jekyll integration]`,
                    type: 'output-success'
                };
                
            default:
                return {
                    text: `bash: ${cmd}: command not found\nType 'help' for available commands.`,
                    type: 'output-error'
                };
        }
    }
    
    appendOutput(text, className = 'output-line') {
        const line = document.createElement('div');
        line.className = className;
        line.textContent = text;
        
        // Remove welcome message if it exists
        const welcome = this.output.querySelector('.welcome-message');
        if (welcome) {
            welcome.remove();
        }
        
        this.output.appendChild(line);
    }
    
    clearOutput() {
        this.output.innerHTML = '';
    }
    
    navigateHistory(direction) {
        if (direction === 'up' && this.historyIndex > 0) {
            this.historyIndex--;
            this.input.value = this.commandHistory[this.historyIndex];
        } else if (direction === 'down' && this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            this.input.value = this.commandHistory[this.historyIndex];
        } else if (direction === 'down' && this.historyIndex === this.commandHistory.length - 1) {
            this.historyIndex = this.commandHistory.length;
            this.input.value = '';
        }
        this.updateCursorPosition();
    }
    
    updateCursorPosition() {
        // Position cursor after input text
        const inputRect = this.input.getBoundingClientRect();
        const textWidth = this.getTextWidth(this.input.value, getComputedStyle(this.input));
        this.cursor.style.left = `${textWidth}px`;
    }
    
    getTextWidth(text, style) {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        context.font = `${style.fontSize} ${style.fontFamily}`;
        return context.measureText(text).width;
    }
    
    scrollToBottom() {
        const content = document.querySelector('.terminal-content');
        content.scrollTop = content.scrollHeight;
    }
    
    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeStr = now.toTimeString().split(' ')[0];
            this.timeDisplay.textContent = `[${timeStr}]`;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }
}

// Initialize terminal when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.terminal = new Terminal();
    
    // Handle mode toggle
    const modeToggle = document.querySelector('.mode-toggle');
    modeToggle.addEventListener('click', () => {
        // For now, just alert - will implement actual toggle later
        alert('Boring mode toggle will be implemented with Jekyll integration');
    });
});
