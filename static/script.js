// Configuration from Flask backend
const WEBSOCK_BROKER_ADDRESS = config.WEBSOCK_BROKER_ADDRESS;
const WEBSOCK_PORT = config.WEBSOCK_PORT;
const WEBSOCKET_BASEPATH = config.WEBSOCKET_BASEPATH;
const USE_CREDS = config.USE_CREDS;
const USER = config.USER;
const PASS = config.PASS;
const USE_WSS = config.USE_WSS; // Set to true for wss://, false for ws://

const token = config.TOKEN;
const user = config.USER_NAME;
const pins = config.PINS;

// Global variables
const switches = document.querySelectorAll('.switch input');
const messageElement = document.getElementById('message');
const timeElement = document.getElementById('time');
const logoutBtn = document.getElementById('logoutBtn');
const loader = document.querySelector('.loader');

let isOnline = false;

// MQTT client setup
const clientId = `${token}/webuser${Math.floor(Math.random() * 9990 + 10)}`;
const client = new Paho.MQTT.Client(WEBSOCK_BROKER_ADDRESS, WEBSOCK_PORT, WEBSOCKET_BASEPATH,clientId);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// Functions
function connect() {
    showLoader(true);
    const options = {
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: USE_WSS, // Use SSL if USE_WSS is true
        cleanSession: true,
    };

    if (USE_CREDS) {
        options.userName = USER;
        options.password = PASS;
    }

    client.connect(options);
}

function onConnect() {
    console.log('Connected to MQTT broker');
    isOnline = true;
    pins.forEach(pin => client.subscribe(`${token}/${pin}`));
    client.subscribe(`${token}/online`);
    showLoader(false);
    updateStatus();
}

function onFailure(error) {
    console.log('Failed to connect:', error.errorMessage);
    isOnline = false;
    showLoader(false);
    updateStatus();
    setTimeout(connect, 2000);
}

function onConnectionLost(responseObject) {
    isOnline = false;
    showLoader(false);
    if (responseObject.errorCode !== 0) {
        console.log('Connection lost:', responseObject.errorMessage);
        setTimeout(connect, 2000);
    }
    updateStatus();
}

function onMessageArrived(message) {
    const [messageToken, device] = message.destinationName.split('/');
    if (pins.includes(device)) {
        updateSwitch(device, message.payloadString);
    } else if (device === 'online') {
        isOnline = message.payloadString === '1';
        updateStatus();
    }
}

function publishMessage(topic, msg) {
    const message = new Paho.MQTT.Message(msg);
    message.destinationName = topic;
    message.retained = true;
    client.send(message);
}

function updateSwitch(pin, state) {
    const switchElement = document.getElementById(`switch${pin.slice(1)}`);
    if (switchElement) {
        switchElement.checked = state === '1';
    }
}

function updateStatus() {
    if (navigator.onLine) {
        if (isOnline) {
            messageElement.textContent = `Connected (${user})`;
            messageElement.style.color = 'var(--primary-color)';
            enableSwitches(true);
        } else {
            messageElement.textContent = `Board OFFLINE (${user})`;
            messageElement.style.color = 'orange';
            enableSwitches(true);
        }
    } else {
        messageElement.textContent = 'No Internet';
        messageElement.style.color = 'var(--danger-color)';
        enableSwitches(false);
    }
}

function enableSwitches(enable) {
    switches.forEach(switchElement => {
        switchElement.disabled = !enable;
    });
}

function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}

function updateTime() {
    const now = new Date();
    const options = {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: true
    };
    timeElement.textContent = now.toLocaleString(undefined, options).replace(', ', ' - ');
}

// Event listeners
switches.forEach(switchElement => {
    switchElement.addEventListener('change', (event) => {
        if (navigator.onLine) {
            const pin = `D${event.target.id.slice(-1)}`;
            const state = event.target.checked ? '1' : '0';
            publishMessage(`${token}/${pin}`, state);
        }
    });
});

logoutBtn.addEventListener('click', () => {
    // Add logout functionality here
    console.log('Logout clicked');
});

// Initialize
connect();
setInterval(updateTime, 1000);
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
