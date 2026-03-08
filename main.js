// 마커를 담을 배열입니다
let markers = [];

let mapContainer = document.getElementById('map');
// 지도 옵션
let mapOption = {
    center: new kakao.maps.LatLng(37.566826, 126.9786567), // 지도의 중심좌표 (서울시청)
    level: 3 // 지도의 확대 레벨
};  

// 지도를 생성합니다    
let map;
let ps;
let infowindow;

// 카카오맵 API가 로드되었는지 확인하고 초기화합니다
if (typeof kakao !== 'undefined' && kakao.maps) {
    kakao.maps.load(function() {
        initMap();
    });
} else {
    // API 로드 실패 시 에러 처리 (API 키 누락 등)
    document.getElementById('map').innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; height:100%; background:#f8f9fa; flex-direction:column; padding:20px; text-align:center;">
            <h3 style="color:#d9534f; margin-bottom:10px;">⚠️ 카카오맵 API 로드 실패</h3>
            <p>1. <code>index.html</code> 파일에서 <strong>YOUR_APP_KEY_HERE</strong> 부분을 실제 발급받은 JavaScript 키로 교체해주세요.</p>
            <p style="margin-top:10px;">2. 카카오 개발자 센터에서 <strong>플랫폼 > Web</strong>에 현재 사이트의 도메인(예: <code>http://localhost:8000</code> 등)이 등록되어 있는지 확인해주세요.</p>
        </div>
    `;
}

function initMap() {
    map = new kakao.maps.Map(mapContainer, mapOption); 
    // 장소 검색 객체를 생성합니다
    ps = new kakao.maps.services.Places();  
    // 검색 결과 목록이나 마커를 클릭했을 때 장소명을 표출할 인포윈도우를 생성합니다
    infowindow = new kakao.maps.InfoWindow({zIndex:1});
}

// 폼 서밋 이벤트 리스너 추가
document.getElementById('search-form').addEventListener('submit', function(e) {
    e.preventDefault();
    if(ps) searchPlaces();
});

// 카테고리 버튼 이벤트 리스너 추가
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        if(!ps || !map) return;
        
        let query = this.getAttribute('data-query');
        // 현재 화면의 중심 좌표를 기준으로 맛집 + 카테고리를 검색
        let center = map.getCenter();
        
        let keyword = '맛집 ' + query;
        document.getElementById('keyword').value = keyword;
        
        // 검색 옵션 설정 (현재 지도 중심 기준 반경 5km)
        let options = {
            location: center,
            radius: 5000,
            sort: kakao.maps.services.SortBy.ACCURACY
        };
        
        ps.keywordSearch(keyword, placesSearchCB, options);
    });
});

// 키워드 검색을 요청하는 함수입니다
function searchPlaces() {
    let keyword = document.getElementById('keyword').value;

    if (!keyword.replace(/^\s+|\s+$/g, '')) {
        alert('키워드를 입력해주세요!');
        return false;
    }

    // 장소검색 객체를 통해 키워드로 장소검색을 요청합니다
    ps.keywordSearch(keyword, placesSearchCB); 
}

// 장소검색이 완료됐을 때 호출되는 콜백함수 입니다
function placesSearchCB(data, status, pagination) {
    if (status === kakao.maps.services.Status.OK) {
        // 정상적으로 검색이 완료됐으면
        displayPlaces(data);
        displayPagination(pagination);
    } else if (status === kakao.maps.services.Status.ZERO_RESULT) {
        alert('검색 결과가 존재하지 않습니다.');
        return;
    } else if (status === kakao.maps.services.Status.ERROR) {
        alert('검색 결과 중 오류가 발생했습니다.');
        return;
    }
}

// 검색 결과 목록과 마커를 표출하는 함수입니다
function displayPlaces(places) {
    let listEl = document.getElementById('places-list'), 
    menuEl = document.getElementById('sidebar'),
    fragment = document.createDocumentFragment(), 
    bounds = new kakao.maps.LatLngBounds(), 
    listStr = '';
    
    removeAllChildNods(listEl);
    removeMarker();
    
    for ( let i=0; i<places.length; i++ ) {
        // 마커를 생성하고 지도에 표시합니다
        let placePosition = new kakao.maps.LatLng(places[i].y, places[i].x),
            marker = addMarker(placePosition, i), 
            itemEl = getListItem(i, places[i]); 

        bounds.extend(placePosition);

        (function(marker, title, place) {
            kakao.maps.event.addListener(marker, 'mouseover', function() {
                displayInfowindow(marker, title);
            });

            kakao.maps.event.addListener(marker, 'mouseout', function() {
                infowindow.close();
            });
            
            // 마커 클릭 시 해당 위치로 부드럽게 이동하고 줌 인
            kakao.maps.event.addListener(marker, 'click', function() {
                 map.panTo(placePosition);
                 displayInfowindow(marker, title, place);
            });

            itemEl.onmouseover =  function () {
                displayInfowindow(marker, title);
            };

            itemEl.onmouseout =  function () {
                infowindow.close();
            };
            
            // 리스트 항목 클릭 시 해당 위치로 이동
            itemEl.onclick = function() {
                 map.panTo(placePosition);
                 displayInfowindow(marker, title, place);
            };

        })(marker, places[i].place_name, places[i]);

        fragment.appendChild(itemEl);
    }

    listEl.appendChild(fragment);
    menuEl.scrollTop = 0;
    map.setBounds(bounds);
}

// 검색결과 항목을 Element로 반환하는 함수입니다
function getListItem(index, places) {
    let el = document.createElement('div');
    el.className = 'place-item';
    
    let itemStr = `
        <div class="place-name">${index + 1}. ${places.place_name}</div>
    `;

    if (places.road_address_name) {
        itemStr += `
            <div class="place-address">${places.road_address_name}</div>
            <div class="place-address" style="color:#999;">(지번) ${places.address_name}</div>
        `;
    } else {
        itemStr += `
            <div class="place-address">${places.address_name}</div>
        `;
    }
                 
    itemStr += `<div class="place-tel">${places.phone}</div>`;
    el.innerHTML = itemStr;

    return el;
}

// 마커를 생성하고 지도 위에 마커를 표시하는 함수입니다
function addMarker(position, idx, title) {
    // 기본 카카오맵 마커 이미지 사용
    let marker = new kakao.maps.Marker({
        position: position
    });

    marker.setMap(map); 
    markers.push(marker);

    return marker;
}

// 지도 위에 표시되고 있는 마커를 모두 제거합니다
function removeMarker() {
    for ( let i = 0; i < markers.length; i++ ) {
        markers[i].setMap(null);
    }   
    markers = [];
}

// 검색결과 목록 하단에 페이지번호를 표시는 함수입니다
function displayPagination(pagination) {
    let paginationEl = document.getElementById('pagination'),
        fragment = document.createDocumentFragment(),
        i; 

    while (paginationEl.hasChildNodes()) {
        paginationEl.removeChild (paginationEl.lastChild);
    }

    for (i=1; i<=pagination.last; i++) {
        let el = document.createElement('a');
        el.href = "#";
        el.innerHTML = i;

        if (i===pagination.current) {
            el.className = 'on';
        } else {
            el.onclick = (function(i) {
                return function(e) {
                    e.preventDefault();
                    pagination.gotoPage(i);
                }
            })(i);
        }

        fragment.appendChild(el);
    }
    paginationEl.appendChild(fragment);
}

// 인포윈도우에 장소명을 표시합니다
function displayInfowindow(marker, title, place) {
    let content = `<div class="info-window"><div class="title">${title}</div>`;
    if(place && place.place_url) {
        content += `<a href="${place.place_url}" target="_blank" style="color:blue; text-decoration:none;">상세보기</a>`;
    }
    content += `</div>`;
    
    infowindow.setContent(content);
    infowindow.open(map, marker);
}

// 검색결과 목록의 자식 Element를 제거하는 함수입니다
function removeAllChildNods(el) {   
    while (el.hasChildNodes()) {
        el.removeChild (el.lastChild);
    }
}