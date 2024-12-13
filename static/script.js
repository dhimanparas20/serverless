// Configuration from Flask backend
const WEBSOCK_BROKER_ADDRESS = config.WEBSOCK_BROKER_ADDRESS;
const WEBSOCK_PORT = config.WEBSOCK_PORT;
const WEBSOCKET_BASEPATH = config.WEBSOCKET_BASEPATH;
const USE_CREDS = config.USE_CREDS;
const MQTT_USER = config.MQTT_USER;
const MQTT_PASS = config.MQTT_PASS;
const WEBSOCK_USE_SSL = config.WEBSOCK_USE_SSL; // Set to true for wss://, false for ws://
const WEBSOCKET_RECONNECT_TIMEOUT = config.WEBSOCKET_RECONNECT_TIMEOUT
const CLEAN_SESSION = config.CLEAN_SESSION
const RETAINED = config.RETAINED
const QOS = config.QOS

const token = config.TOKEN;
const user = config.USER_NAME;
const pins = config.PINS;

let locationData = null; // Object to store city, state, and pincode
let weatherFetchInterval = 60 * 60 * 1000; // 1 hour

// Global variables
const switches = document.querySelectorAll('.switch input');
const messageElement = document.getElementById('message');
const timeElement = document.getElementById('time');
const loader = document.querySelector('.loader');

let isOnline = false;

// MQTT client setup
const clientId = `${token}/webuser_${Math.floor(Math.random() * 9990 + 10)}`;
const client = new Paho.MQTT.Client(WEBSOCK_BROKER_ADDRESS, WEBSOCK_PORT, WEBSOCKET_BASEPATH,clientId);

client.onConnectionLost = onConnectionLost;
client.onMessageArrived = onMessageArrived;

// Connect to MQTT Broker Server
function connect() {
    showLoader(true);
    const options = {
        onSuccess: onConnect,
        onFailure: onFailure,
        useSSL: WEBSOCK_USE_SSL, // Use SSL // Use SSL 
        cleanSession: CLEAN_SESSION,
    };

    if (USE_CREDS) {
        options.userName = MQTT_USER;
        options.password = MQTT_PASS;
    }

    client.connect(options);
}

// Handler if Connection Successful
function onConnect() {
    console.log('Connected to MQTT broker');
    isOnline = true;
    pins.forEach(pin => client.subscribe(`${token}/${pin}`));
    client.subscribe(`${token}/online`);
    showLoader(false);
    updateStatus();
}

// Handler if Connection Failed
function onFailure(error) {
    console.log('Failed to connect:', error.errorMessage);
    isOnline = false;
    showLoader(false);
    updateStatus();
    setTimeout(connect, WEBSOCKET_RECONNECT_TIMEOUT);
}

// Handler if Connection Lost
function onConnectionLost(responseObject) {
    isOnline = false;
    showLoader(false);
    if (responseObject.errorCode !== 0) {
        console.log('Connection lost:', responseObject.errorMessage);
        setTimeout(connect, WEBSOCKET_RECONNECT_TIMEOUT);
    }
    updateStatus();
}

// Handler if a message arrives on subscribed topic
function onMessageArrived(message) {
    const [messageToken, device] = message.destinationName.split('/');
    const payload = message.payloadString;
    // console.log(messageToken,device,payload)

    if (pins.includes(device)) {
        // Update switch state based on retained message
        updateSwitch(device, payload);
    } else if (device === 'online') {
        isOnline = payload === '1';
        updateStatus();
    }
}

// Handler to publish message on a topic
function publishMessage(topic, msg) {
    const message = new Paho.MQTT.Message(msg);
    message.destinationName = topic;
    message.qos = QOS;
    message.retained = RETAINED;
    client.send(message);
}

function updateSwitch(pin, state) {
    if (pin === "D5"){
        let jsonObject = JSON.parse(state);
        // console.log("Temperatue: "+jsonObject.temperature)
        // console.log("Humidity: "+jsonObject.humidity)
        // console.log("Feels Like: "+jsonObject.heat_index)
        $('#tmp').text("🌡"+jsonObject.temperature+"°C, ");
        $('#hi').text("🙎‍♂️"+jsonObject.heat_index+"°C");
        $('#hmdt').text("💧"+jsonObject.humidity+"%, ");
        $('#up_time').text("⏳"+jsonObject.time);

    }
    else{
        const switchElement = document.getElementById(`switch${pin.slice(1)}`);
        if (switchElement) {
            switchElement.checked = state === '1';
        }
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

// Function to fetch and send weather data using stored location
function fetchWeather() {
    if (!locationData) return; // Skip if location data is not available

    if (navigator.onLine) { // Check if the device is online
        $.ajax({
            url: '/get_weather',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                city: locationData.city,
                state: locationData.state,
                pincode: locationData.pincode
            }),
            success: function(response) {
                const weather = response.weather_data;
                $('#temp').text("\ud83c\udf21\ufe0f" + (weather.tmp || '-'));
                $('#wind_speed').text(" \ud83c\udf2c\ufe0f" + (weather.ws || '-'));
                $('#desc').text(" \u25aa\ufe0f" + (weather.dc || '-'));
                $('#last_fetch').text(" \u23f1\ufe0f" + formatTime() || '-');
                if (weather.img_src) {
                    $('#weather_icon').attr('src', weather.img_src).removeClass('hidden');
                }
            },
            error: function(err) {
                console.error('Error fetching weather data:', err);
            }
        });
    } else {
        console.warn("No internet connection. Skipping weather update.");
    }
}

// Function to fetch user's location and reverse geocode only once
function fetchLocationOnce() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(success, error);
    } else {
        console.error("Geolocation is not supported by this browser.");
        showGeolocationPrompt();
    }

    async function success(position) {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
            const data = await response.json();

            locationData = {
                city: data.address.city || data.address.town || data.address.village || "Unknown City",
                state: data.address.state || "Unknown State",
                pincode: data.address.postcode || "Unknown Pincode"
            };

            // Update the UI with location details
            $('#location').text("\ud83c\udf0d" + locationData.city);
            $('#pincode').text("\ud83d\udce2" + locationData.pincode + ", ");

            console.log(`Location fetched: ${locationData.city}, ${locationData.state}, ${locationData.pincode}`);

            // Fetch weather immediately after location is fetched
            fetchWeather();
        } catch (err) {
            console.error("Error fetching location details:", err);
        }
    }

    function error(err) {
        console.error(`Error (${err.code}): ${err.message}`);
        showGeolocationPrompt();
    }
}

function showGeolocationPrompt() {
    $('#geolocationPrompt').removeClass('hidden');
}

// Button prompt that shows to enable location
$('#enableLocation').on('click', function() {
    $('#geolocationPrompt').addClass('hidden');
    fetchLocationOnce();
});

// Loader Animation
function showLoader(show) {
    loader.style.display = show ? 'block' : 'none';
}

// Main Clock time
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

// Time for Weather last fetched
function formatTime() {
    const now = new Date();

    let hours = now.getHours();
    let minutes = now.getMinutes();
    let seconds = now.getSeconds();

    // Determine AM or PM
    const ampm = hours >= 12 ? 'PM' : 'AM';

    // Convert hours to 12-hour format
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12 for 12-hour format

    // Pad single digit minutes and seconds with a leading zero
    minutes = minutes < 10 ? '0' + minutes : minutes;
    seconds = seconds < 10 ? '0' + seconds : seconds;

    // Format the time string
    const timeString = `${hours}:${minutes}:${seconds} ${ampm}`;
    
    return timeString;
}

// Initialize
connect();   //Connect to MQTT server
fetchLocationOnce(); // Fetch location only once on load
setInterval(fetchWeather, weatherFetchInterval); // Update weather every 30 minutes
setInterval(updateTime, 1000); // Update clock every second
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

