let map;
let marker;
let currentLat = 0;
let currentLng = 0;
const socketFrames = [];

function initMap() {
    map = L.map('map').setView([51.9194, 19.1451], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    navigator.geolocation.getCurrentPosition(pos => {
        currentLat = pos.coords.latitude;
        currentLng = pos.coords.longitude;
        map.setView([currentLat, currentLng], 18);
        marker = L.marker([currentLat, currentLng], { draggable: true }).addTo(map);
        marker.on('dragend', function (e) {
            const pos = marker.getLatLng();
            currentLat = pos.lat;
            currentLng = pos.lng;
        });
    }, () => alert('Nie udało się pobrać lokalizacji'));
}

function uuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(/[018]/g, c =>
        (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16)
    );
}

function proceedToForm() {
    document.querySelector('[name="lat"]').value = currentLat;
    document.querySelector('[name="lng"]').value = currentLng;
    document.getElementById('mapView').classList.add('hidden');
    document.getElementById('formView').classList.remove('hidden');
    document.getElementById('submitBar').classList.remove('hidden');
}

function showSocketModal() {
    document.getElementById('socketModal').classList.remove('hidden');
}

function hideSocketModal() {
    document.getElementById('socketModal').classList.add('hidden');
    document.getElementById('socketForm').reset();
}

document.getElementById('socketForm').addEventListener('submit', e => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const socket = Object.fromEntries(formData.entries());

    socket.device_key = 'WEB';
    socket.local_id = uuid();
    socket.primary_id = `web_${socket.local_id}`;
    socketFrames.push(socket);

    const getOptionLabel = (selectName, value) => {
        const select = document.querySelector(`[name="${selectName}"]`);
        const option = Array.from(select.options).find(o => o.value === value);
        return option ? option.textContent : value;
    };

    const tr = document.createElement('tr');
    tr.innerHTML = `
  <td class="p-2">${socket.number}</td>
  <td class="p-2">${getOptionLabel('socket_type_id', socket.socket_type_id)}</td>
  <td class="p-2">${getOptionLabel('socket_model_id', socket.socket_model_id)}</td>
  <td class="p-2">${getOptionLabel('linter_model_id', socket.linter_model_id)}</td>
  <td class="p-2">${socket.lamp_form_linter_power}</td>
  <td class="p-2 text-right">
    <button onclick="removeSocket(this)" class="text-red-600 hover:underline">Usuń</button>
  </td>
`;
    document.getElementById('socketList').appendChild(tr);

    hideSocketModal();
});

function removeSocket(button) {
    const row = button.closest('tr');
    const index = Array.from(row.parentElement.children).indexOf(row);
    socketFrames.splice(index, 1);
    row.remove();
}

document.getElementById('lampForm').addEventListener('submit', async e => {
    e.preventDefault();
    if (socketFrames.length === 0) {
        alert("Dodaj przynajmniej jedną oprawę.");
        return;
    }

    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    data.device_key = 'WEB';
    data.local_id = uuid();
    data.primary_id = `web_${data.local_id}`;
    data.status = 1;
    data.sockets = socketFrames;

    // console.log(data);
    const res = await fetch('http://linterview.pl/api/save_lamp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });

    const result = await res.json();
    alert(result.message || 'Zapisano lampę');
});

// Uzupełnienie listy racks i stations
function populateRackAndStationSelects(dict) {
    const racks = dict.racks || [];
    const stations = dict.stations || [];

    const rackSelect = document.getElementById("rack_primary_id");
    const stationSelect = document.getElementById("station_primary_id");

    racks.forEach(rack => {
        const option = document.createElement("option");
        option.value = rack.primary_id;
        option.textContent = rack.name;
        rackSelect.appendChild(option);
    });

    stations.forEach(station => {
        const option = document.createElement("option");
        option.value = station.primary_id;
        option.textContent = station.name;
        stationSelect.appendChild(option);
    });
}

async function loadDictionaries() {
    const res = await fetch('http://linterview.pl/api/get_dict');
    const dict = await res.json();

    const maps = {
        column_type_id: dict.dict_lamp_column_types,
        column_property_id: dict.dict_lamp_column_properties,
        line_type_id: dict.dict_lamp_line_types,
        line_location_id: dict.dict_lamp_line_locations,
        mounting_id: dict.dict_lamp_mountings,
        arm_id: dict.dict_lamp_arms,
        arm_status_id: dict.dict_lamp_arms_status,
        road_type_id: dict.dict_lamp_road_types,
        road_category_id: dict.dict_lamp_road_categories,
        road_class_id: dict.dict_lamp_road_class,
        sidewalk_type_id: dict.dict_lamp_sidewalk_types,
        pavement_type_id: dict.dict_lamp_pavement_types,
        socket_type_id: dict.dict_lamp_socket_types,
        socket_model_id: dict.dict_lamp_socket_models,
        linter_model_id: dict.dict_lamp_linter_models
    };

    for (const name in maps) {
        const values = maps[name];
        document.querySelectorAll(`[name="${name}"]`).forEach(select => {
            select.innerHTML = '';
            values.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.id;
                option.textContent = opt.name;
                select.appendChild(option);
            });
        });
    }

    populateRackAndStationSelects(dict);
}

window.onload = () => {
    document.getElementById('saveLampBtn').addEventListener('click', () => {
        document.getElementById('lampForm').requestSubmit();
    });
    initMap();
    loadDictionaries();
};
