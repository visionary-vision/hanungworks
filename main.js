let markers = [];
let map;
let ps;
let infowindow;
let currentLocation = "";

// 1. 카카오맵 초기화 함수
function initMap() {
    console.log("Initializing Map...");
    const mapContainer = document.getElementById('map');
    const mapOption = {
        center: new kakao.maps.LatLng(37.566826, 126.9786567),
        level: 3
    };  
    
    try {
        map = new kakao.maps.Map(mapContainer, mapOption); 
        
        // 장소 검색 서비스 객체 생성 (libraries=services 파라미터가 필요함)
        if (kakao.maps.services) {
            ps = new kakao.maps.services.Places();  
            console.log("Places service initialized.");
        } else {
            console.error("Kakao Maps Services library is missing.");
            alert("카카오 장소 검색 라이브러리가 로드되지 않았습니다. index.html에 libraries=services 설정이 있는지 확인해주세요.");
        }
        
        infowindow = new kakao.maps.InfoWindow({zIndex:1});
    } catch (e) {
        console.error("Map initialization failed:", e);
    }
}

// 2. 스크립트 로드 확인 및 실행
// 카카오맵 SDK는 동기적으로 로드되므로 바로 실행하거나 load 이벤트를 기다립니다.
window.onload = function() {
    if (typeof kakao !== 'undefined' && kakao.maps) {
        kakao.maps.load(function() {
            initMap();
        });
    } else {
        console.error("Kakao SDK not found.");
        document.getElementById('map').innerHTML = `<div style="padding:100px; text-align:center; background:#eee;">카카오맵 SDK를 불러올 수 없습니다. API 키와 도메인 설정을 확인해주세요.</div>`;
    }
};

// 3. 시작 화면: 위치 검색 제출
document.getElementById('start-form').addEventListener('submit', function(e) {
    e.preventDefault();
    let location = document.getElementById('start-location').value;
    if (!location || !location.trim()) return;

    if (!ps) {
        // ps가 없을 경우 다시 한 번 생성을 시도해봅니다.
        if (typeof kakao !== 'undefined' && kakao.maps.services) {
            ps = new kakao.maps.services.Places();
        } else {
            alert('지도 서비스가 아직 준비되지 않았습니다. 잠시 후 다시 시도하거나, 카카오 개발자 센터에서 도메인 설정을 확인해주세요.');
            return;
        }
    }

    // 장소(위치) 검색
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
            if (status === kakao.maps.services.Status.ZERO_RESULT) {
                alert('검색 결과가 없습니다. 다른 지역을 입력해 주세요.');
            } else {
                alert('위치 검색 중 오류가 발생했습니다. 상태 코드: ' + status);
                console.error("Search failed with status:", status);
            }
        }
    });
});

// 4. 카테고리 버튼 클릭 시 맛집 검색
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
        
        document.getElementById('sidebar').classList.remove('hidden');
        document.getElementById('current-location-text').innerText = category;
    });
});

// 5. 지역 다시 입력 버튼
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

// 공통 검색 콜백 및 마커 관리 함수들
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        displayPlaces(data);
        displayPagination(pagination);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('주변에 해당 맛집이 없습니다.');
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