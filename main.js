let markers = [];
let map;
let ps;
let infowindow;
let currentLocation = "";

// 1. 카카오맵 초기화
function initMap() {
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 3
    };  
    
    try {
        map = new kakao.maps.Map(mapContainer, mapOption); 
        if (kakao.maps.services) {
            ps = new kakao.maps.services.Places();  
        }
        infowindow = new kakao.maps.InfoWindow({zIndex:1});
    } catch (e) {
        console.error("Map initialization failed:", e);
    }
}

window.onload = function() {
    if (typeof kakao !== 'undefined' && kakao.maps) {
        kakao.maps.load(function() {
            initMap();
        });
    }
};

// 2. 시작 화면: 위치 검색
document.getElementById('start-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let location = document.getElementById('start-location').value;
    if (!location || !location.trim()) return;

    if (!ps) {
        alert('지도 서비스를 불러오는 중입니다. 잠시만 기다려주세요.');
        return;
    }

    ps.keywordSearch(location, function(data, status) {
        if (status === kakao.maps.services.Status.OK) {
            let firstResult = data[0];
            let newPos = new kakao.maps.LatLng(firstResult.y, firstResult.x);
            
            currentLocation = location;
            map.setCenter(newPos);
            map.setLevel(4);
            
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('category-menu').classList.remove('hidden');
        } else {
            alert('해당 지역을 찾을 수 없습니다.');
        }
    });
});

// 3. 카테고리 검색 및 바텀 시트 활성화
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if (!ps) return;
        
        let category = this.getAttribute('data-query');
        let keyword = currentLocation + " " + category;
        
        ps.keywordSearch(keyword, placesSearchCB, {
            location: map.getCenter(),
            radius: 2000,
            sort: kakao.maps.services.SortBy.ACCURACY
        });
        
        // 바텀 시트 열기 애니메이션
        const sidebar = document.getElementById('sidebar');
        sidebar.classList.remove('hidden');
        setTimeout(() => sidebar.classList.add('active'), 50);
        
        document.getElementById('current-location-text').innerText = category;
    });
});

// 사이드바/바텀시트 닫기
document.getElementById('close-sidebar').addEventListener('click', function() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
    setTimeout(() => sidebar.classList.add('hidden'), 400);
});

// 4. 지역 다시 입력
document.getElementById('re-search-btn').addEventListener('click', function() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('category-menu').classList.add('hidden');
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.remove('active');
    sidebar.classList.add('hidden');
    document.getElementById('start-location').value = "";
    removeMarker();
});

// 5. 문의 모달 제어
const inquiryModal = document.getElementById('inquiry-modal');
document.getElementById('open-inquiry-btn').addEventListener('click', () => inquiryModal.classList.remove('hidden'));
document.getElementById('close-modal-btn').addEventListener('click', () => inquiryModal.classList.add('hidden'));
window.addEventListener('click', (e) => { if (e.target === inquiryModal) inquiryModal.classList.add('hidden'); });

// --- 검색 및 마커 로직 ---

function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        displayPlaces(data);
        displayPagination(pagination);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('주변에 맛집이 없습니다.');
    }
}

function displayPlaces(places) {
    let listEl = document.getElementById('places-list');
    let fragment = document.createDocumentFragment();
    let bounds = new kakao.maps.LatLngBounds();
    
    removeAllChildNods(listEl);
    removeMarker();
    
    for (let i = 0; i < places.length; i++) {
        let placePosition = new kakao.maps.LatLng(places[i].y, places[i].x);
        let marker = addMarker(placePosition, i);
        let itemEl = getListItem(i, places[i]); 

        bounds.extend(placePosition);

        (function(marker, title, place) {
            kakao.maps.event.addListener(marker, 'click', function() {
                displayInfowindow(marker, title, place);
                map.panTo(marker.getPosition());
                // 마커 클릭 시 시트가 닫혀있다면 열어줌
                document.getElementById('sidebar').classList.add('active');
            });
            itemEl.onclick = function() {
                displayInfowindow(marker, title, place);
                map.panTo(marker.getPosition());
                // 모바일에서 항목 클릭 시 지도를 더 잘 볼 수 있게 시트를 약간 내리는 처리를 할 수도 있음
            };
        })(marker, places[i].place_name, places[i]);

        fragment.appendChild(itemEl);
    }
    listEl.appendChild(fragment);
    map.setBounds(bounds);
}

function getListItem(index, places) {
    let el = document.createElement('div');
    el.className = 'place-item';
    el.innerHTML = `
        <div class="place-name">${index + 1}. ${places.place_name}</div>
        <div class="place-address">${places.road_address_name || places.address_name}</div>
    `;
    return el;
}

function addMarker(position, idx) {
    let marker = new kakao.maps.Marker({ position: position });
    marker.setMap(map);
    markers.push(marker);
    return marker;
}

function removeMarker() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}

function displayPagination(pagination) {
    let paginationEl = document.getElementById('pagination');
    while (paginationEl.hasChildNodes()) paginationEl.removeChild(paginationEl.lastChild);
    for (let i = 1; i <= pagination.last; i++) {
        let el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;
        if (i === pagination.current) el.className = 'on';
        else el.onclick = (function(i) { return function(e) { e.preventDefault(); pagination.gotoPage(i); } })(i);
        paginationEl.appendChild(el);
    }
}

function displayInfowindow(marker, title, place) {
    let content = `<div class="info-window"><div class="title">${title}</div><a href="${place.place_url}" target="_blank">상세보기</a></div>`;
    infowindow.setContent(content);
    infowindow.open(map, marker);
}

function removeAllChildNods(el) {
    while (el.hasChildNodes()) el.removeChild(el.lastChild);
}