let markers = [];
let map;
let ps;
let infowindow;
let currentLocation = ""; // 현재 검색한 중심 위치 명칭

// 초기 설정
if (typeof kakao !== 'undefined' && kakao.maps) {
    kakao.maps.load(function() {
        initMap();
    });
} else {
    document.getElementById('map').innerHTML = `<div style="padding:100px; text-align:center;">카카오맵 API를 로드할 수 없습니다.</div>`;
}

function initMap() {
    let mapContainer = document.getElementById('map');
    let mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 3
    };  
    map = new kakao.maps.Map(mapContainer, mapOption); 
    ps = new kakao.maps.services.Places();  
    infowindow = new kakao.maps.InfoWindow({zIndex:1});
}

// 1. 시작 화면: 위치 검색 제출
document.getElementById('start-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let location = document.getElementById('start-location').value;
    if (!location.trim()) return;

    // 장소(위치) 검색
    ps.keywordSearch(location, function(data, status) {
        if (status === kakao.maps.services.Status.OK) {
            // 첫 번째 검색 결과의 좌표로 지도 이동
            let firstResult = data[0];
            let newPos = new kakao.maps.LatLng(firstResult.y, firstResult.x);
            
            currentLocation = location;
            map.setCenter(newPos);
            map.setLevel(4);
            
            // UI 전환: 시작 화면 숨기고 카테고리 메뉴 표시
            document.getElementById('start-screen').classList.add('hidden');
            document.getElementById('category-menu').classList.remove('hidden');
        } else {
            alert('입력하신 지역을 찾을 수 없습니다. 다시 시도해주세요.');
        }
    });
});

// 2. 카테고리 버튼 클릭 시 맛집 검색
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        let category = this.getAttribute('data-query');
        let keyword = currentLocation + " " + category; // 예: "강남역 한식"
        
        // 검색 실행
        ps.keywordSearch(keyword, placesSearchCB, {
            location: map.getCenter(),
            radius: 2000,
            sort: kakao.maps.services.SortBy.ACCURACY
        });
        
        // 사이드바 표시
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('current-location-text').innerText = category;
    });
});

// 3. 지역 다시 입력 버튼
document.getElementById('re-search-btn').addEventListener('click', function() {
    document.getElementById('start-screen').classList.remove('hidden');
    document.getElementById('category-menu').classList.add('hidden');
    document.getElementById('sidebar').classList.add('hidden');
    document.getElementById('start-location').value = "";
    document.getElementById('start-location').focus();
    removeMarker();
});

// 사이드바 닫기
document.getElementById('close-sidebar').addEventListener('click', function() {
    document.getElementById('sidebar').classList.add('hidden');
});

// --- 기존 검색 처리 로직 유지 및 보완 ---

function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        displayPlaces(data);
        displayPagination(pagination);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('주변에 해당 맛집이 없습니다.');
    }
}

function displayPlaces(places) {
    let listEl = document.getElementById('places-list'), 
    fragment = document.createDocumentFragment(), 
    bounds = new kakao.maps.LatLngBounds();
    
    removeAllChildNods(listEl);
    removeMarker();
    
    for ( let i=0; i<places.length; i++ ) {
        let placePosition = new kakao.maps.LatLng(places[i].y, places[i].x),
            marker = addMarker(placePosition, i), 
            itemEl = getListItem(i, places[i]); 

        bounds.extend(placePosition);

        (function(marker, title, place) {
            kakao.maps.event.addListener(marker, 'click', function() {
                displayInfowindow(marker, title, place);
                map.panTo(marker.getPosition());
            });
            itemEl.onclick = function() {
                displayInfowindow(marker, title, place);
                map.panTo(marker.getPosition());
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

    for (let i=1; i<=pagination.last; i++) {
        let el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;
        if (i===pagination.current) el.className = 'on';
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