
    // --- ACCESSIBILITY FONT SIZE LOGIC (UX Master) ---
    let currentFontSizeOffset = parseInt(localStorage.getItem('baoan_fontSizeOffset')) || 0;
    
    function applyFontSize() {
      if (currentFontSizeOffset !== 0) {
        document.documentElement.style.fontSize = `calc(clamp(18px, 5vw, 24px) + ${currentFontSizeOffset}px)`;
      } else {
        document.documentElement.style.fontSize = ''; // revert to default CSS
      }
    }

    function changeFontSize(delta) {
      currentFontSizeOffset += delta;
      // Giới hạn phóng to/thu nhỏ
      if (currentFontSizeOffset > 8) currentFontSizeOffset = 8; // Tối đa +8px để tránh vỡ layout
      if (currentFontSizeOffset < -4) currentFontSizeOffset = -4; // Tối thiểu -4px
      
      localStorage.setItem('baoan_fontSizeOffset', currentFontSizeOffset);
      applyFontSize();
      
      Swal.fire({
        title: 'Cỡ chữ: ' + (currentFontSizeOffset > 0 ? ('+' + currentFontSizeOffset) : currentFontSizeOffset),
        toast: true,
        position: 'top',
        showConfirmButton: false,
        timer: 1000,
        background: 'var(--primary)',
        color: '#000'
      });
    }
    
    // Áp dụng ngay khi tải trang
    applyFontSize();
    // ------------------------------------------------
    // URL WEB APP APPS SCRIPT CỦA BOSS
    // Khi deploy Apps Script dưới dạng Web App, hãy copy URL dán vào đây để đồng bộ 100% thời gian thực.
    const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwkkVi6nJcZjEVLJcLy41OjcRn9qK8apn_Shj81b6k4-XrBuCt8yXGwkoqwm_ngXVU-Nw/exec?action=get_schedule";

    // ── NORMALIZER: Map GAS UPPERCASE keys → Frontend PascalCase ──
    // GAS API: COT1, NGAY, GIO, TUYENDUONG, GIAGHEP, SOGHETRONG, LOAIXE, TRANGTHAI
    // Frontend: ID, Ngay, Gio, TuyenDuong, GiaGhep, SoGheTrong, LoaiXe, TrangThai
    function normalizeTrip(raw) {
      if (!raw || typeof raw !== 'object') return {ID:'',Ngay:'',Gio:'',TuyenDuong:'',GiaGhep:'',SoGheTrong:'',LoaiXe:'',TrangThai:''};
      var g = function(upper, pascal) { var v = raw[upper] !== undefined ? raw[upper] : raw[pascal]; return (v === null || v === undefined) ? '' : String(v); };
      return {
        ID: g('COT1','ID'), Ngay: g('NGAY','Ngay'), Gio: g('GIO','Gio'),
        TuyenDuong: g('TUYENDUONG','TuyenDuong'), GiaGhep: g('GIAGHEP','GiaGhep'),
        SoGheTrong: g('SOGHETRONG','SoGheTrong'), LoaiXe: g('LOAIXE','LoaiXe'),
        TrangThai: g('TRANGTHAI','TrangThai')
      };
    }
    function normalizeArray(arr) { return Array.isArray(arr) ? arr.map(normalizeTrip) : []; }

    // DỮ LIỆU CHẠY THỬ (FALLBACK MOCK DATA) 
    // Giúp trang hiển thị lung linh ngay cả khi chưa gắn URL Google Sheets hoặc mất mạng.
    const MOCK_TRIPS = [
      {
        "ID": "CG001",
        "Ngay": "Thứ Năm, 07/05",
        "Gio": "08:00",
        "TuyenDuong": "Đam Rông ➡️ Sân Bay Liên Khương",
        "GiaGhep": "250k",
        "SoGheTrong": "3",
        "LoaiXe": "7 chỗ",
        "TrangThai": "Còn trống"
      },
      {
        "ID": "CG002",
        "Ngay": "Thứ Năm, 07/05",
        "Gio": "14:30",
        "TuyenDuong": "Sân Bay Liên Khương ➡️ Đam Rông",
        "GiaGhep": "250k",
        "SoGheTrong": "2",
        "LoaiXe": "7 chỗ",
        "TrangThai": "Còn trống"
      },
      {
        "ID": "CG003",
        "Ngay": "Thứ Sáu, 08/05",
        "Gio": "09:00",
        "TuyenDuong": "Đà Lạt ➡️ Sân Bay Liên Khương",
        "GiaGhep": "150k",
        "SoGheTrong": "4",
        "LoaiXe": "7 chỗ",
        "TrangThai": "Còn trống"
      },
      {
        "ID": "CG004",
        "Ngay": "Thứ Bảy, 09/05",
        "Gio": "16:00",
        "TuyenDuong": "Sân Bay Liên Khương ➡️ Đà Lạt",
        "GiaGhep": "150k",
        "SoGheTrong": "0",
        "LoaiXe": "4 chỗ",
        "TrangThai": "Đã đầy"
      }
    ];

    // ── IFRAME-AWARE CALL HANDLER ──────────────────────────────
    function callPhone() {
      const tel = 'tel:0915745030';
      try {
        if (window.self !== window.top) {
          // Inside iframe (Google Sites) — open in new window
          const w = window.open(tel, '_blank');
          if (!w) {
            // Popup blocked — show number
            alert('📞 Gọi: 0915.74.50.30');
          }
          return;
        }
      } catch(e) { /* cross-origin, assume iframe */ window.open(tel, '_blank'); return; }
      // Direct access — standard tel:
      window.location.href = tel;
    }

    // ── TRIP MODE & PRICE ENGINE ──────────────────────────────
    var tripMode = 'one';
    var carpoolData = [];
    var selectedDate = null;
    const BASE_URL = "https://script.google.com/macros/s/AKfycbwkkVi6nJcZjEVLJcLy41OjcRn9qK8apn_Shj81b6k4-XrBuCt8yXGwkoqwm_ngXVU-Nw/exec";

    function setTripMode(mode) {
      tripMode = mode;
      document.getElementById('btn-mode-1').style.background = mode==='one' ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
      document.getElementById('btn-mode-1').style.color = mode==='one' ? '#000' : 'var(--text-muted)';
      document.getElementById('btn-mode-2').style.background = mode==='round' ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
      document.getElementById('btn-mode-2').style.color = mode==='round' ? '#000' : 'var(--text-muted)';
      calculatePrice();
    }

    function calculatePrice() {
      var km = parseFloat(document.getElementById('inp-km').value) || 0;
      if (km <= 0) { document.getElementById('price-container').style.display='none'; return; }
      document.getElementById('price-container').style.display = 'block';
      var market = km * 14000;
      var discount = 50000;
      if (km > 10 && km <= 40) discount = 150000;
      else if (km > 40 && km <= 70) discount = 250000;
      else if (km > 70) discount = 450000;
      var baoan = market - discount;
      var f = (tripMode === 'round') ? 1.4 : 1;
      document.getElementById('lbl-price-market').innerText = formatVND(market * f);
      document.getElementById('lbl-price-baoan').innerText = formatVND(baoan * f);
      document.getElementById('lbl-saving').innerText = formatVND((market - baoan) * f);
    }

    function formatVND(v) { return Math.round(v).toLocaleString('vi-VN') + 'đ'; }

    async function submitBooking() {
      var phone = document.getElementById('inp-phone').value;
      var from = document.getElementById('inp-from').value;
      var to = document.getElementById('inp-to').value;
      var km = document.getElementById('inp-km').value;
      if(!phone || !from || !to) { Swal.fire({icon:'warning',title:'Thiếu thông tin',text:'Vui lòng nhập SĐT, điểm đón và điểm đến!',background:'#1e293b',color:'#fff'}); return; }
      Swal.fire({title:'Đang gửi...',allowOutsideClick:false,didOpen:()=>Swal.showLoading(),background:'#1e293b',color:'#fff'});
      try {
        var resp = await fetch(BASE_URL, {
          method: 'POST',
          headers: {'Content-Type':'text/plain'},
          body: JSON.stringify({action:'save_booking',phone:phone,from:from,to:to,km:km,tripType:tripMode,carType:'VinFast VF5'})
        });
        var data = await resp.json();
        Swal.fire({icon:'success',title:'Đã gửi yêu cầu!',text:'Bảo An sẽ gọi lại ngay.',background:'#1e293b',color:'#fff'});
      } catch(err) {
        Swal.fire({icon:'error',title:'Lỗi kết nối',text:'Vui lòng gọi Hotline: 0915.74.50.30',background:'#1e293b',color:'#fff'});
      }
    }

    // ── LỊCH GHÉP FUNCTIONS ──────────────────────────────
    async function loadCarpoolData() {
      // Dữ liệu đã được load và chuẩn hóa ở màn hình chính
      renderCarpoolUI();
    }

    function renderCarpoolUI() {
      document.getElementById('lichghep-loading').style.display = 'none';
      if (!carpoolData || carpoolData.length === 0) {
        document.getElementById('lichghep-empty').style.display = 'block';
        document.getElementById('lichghep-list').innerHTML = '';
        return;
      }
      // Date scroller
      var dates = [...new Set(carpoolData.map(i => i.Ngay))].filter(Boolean);
      dates.sort((a,b) => { var pA=a.split('/'),pB=b.split('/'); return new Date(pA[2],pA[1]-1,pA[0]) - new Date(pB[2],pB[1]-1,pB[0]); });
      if (!selectedDate && dates.length > 0) selectedDate = dates[0];
      var scrollerHtml = '';
      dates.forEach(d => {
        var p = d.split('/');
        var dow = new Date(p[2],p[1]-1,p[0]).toLocaleDateString('vi-VN',{weekday:'short'}).replace('.','');
        var isActive = d === selectedDate;
        scrollerHtml += '<div onclick="selectDate(\''+d+'\')" style="min-width:85px;height:95px;background:'+(isActive?'var(--primary)':'rgba(255,255,255,0.04)')+';border-radius:16px;border:1px solid '+(isActive?'#fff':'rgba(255,255,255,0.08)')+';display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0;"><span style="font-size:1rem;font-weight:700;color:'+(isActive?'#000':'var(--text-muted)')+';text-transform:uppercase;">'+dow+'</span><span style="font-size:1.6rem;font-weight:800;color:'+(isActive?'#000':'var(--text-main)')+';">'+p[0]+'</span><span style="width:6px;height:6px;background:'+(isActive?'#000':'var(--primary)')+';border-radius:50%;margin-top:6px;"></span></div>';
      });
      document.getElementById('date-scroller').innerHTML = scrollerHtml;
      // Filter by date
      var filtered = carpoolData.filter(i => i.Ngay === selectedDate);
      if (filtered.length === 0) { document.getElementById('lichghep-empty').style.display='block'; document.getElementById('lichghep-list').innerHTML=''; return; }
      document.getElementById('lichghep-empty').style.display = 'none';
      var html = '';
      filtered.forEach(item => {
        var id = item.ID || '';
        var tuyen = item.TuyenDuong || '';
        var ngay = item.Ngay || '';
        var gio = item.Gio || '';
        var gia = item.GiaGhep || '0đ';
        var ghe = parseInt(item.SoGheTrong || 0);
        if(!id||!tuyen) return;
        var itemStr = btoa(unescape(encodeURIComponent(JSON.stringify({id:id,route:tuyen,date:ngay,time:gio,price:gia,seats:ghe}))));
        html += '<div style="background:rgba(255,255,255,0.03);border-radius:20px;padding:25px 20px;margin-bottom:20px;border:1px solid rgba(255,255,255,0.05);position:relative;"><div style="font-size:1.6rem;font-weight:700;color:var(--primary);margin-bottom:12px;">'+tuyen+'</div><div style="font-size:1.8rem;font-weight:800;position:absolute;top:25px;right:20px;color:var(--primary);">'+gia+'</div><div style="font-size:1.2rem;color:#fff;font-weight:600;margin-bottom:8px;">🕒 '+gio+'</div><div style="font-size:1.1rem;color:#22c55e;font-weight:700;background:rgba(34,197,94,0.1);display:inline-block;padding:8px 14px;border-radius:8px;">Ghế trống: '+ghe+'</div><button onclick="openBookingModal(\''+itemStr+'\')" style="width:100%;margin-top:20px;padding:18px;border-radius:14px;border:none;font-size:1.2rem;font-weight:700;background:linear-gradient(135deg,var(--primary),#FFA500);color:#000;cursor:pointer;font-family:inherit;">XEM CHỖ & ĐẶT VÉ</button></div>';
      });
      document.getElementById('lichghep-list').innerHTML = html;
    }

    function selectDate(d) { selectedDate = d; renderCarpoolUI(); }

    // ── SƠ ĐỒ GHẾ + BOOKING ──────────────────────────────
    var selectedCarpool = null;
    var selectedSeat = null;

    function openBookingModal(itemB64) {
      var d = JSON.parse(decodeURIComponent(escape(atob(itemB64))));
      selectedCarpool = d;
      selectedSeat = null;
      
      var zoneSelect = document.getElementById('ghep-zone');
      var optionsHtml = '';
      var routeStr = (d.route || '').toLowerCase();
      var isToDalat = routeStr.indexOf('đam rông') < routeStr.indexOf('đà lạt');
      
      var options = [];
      if (isToDalat) {
        options = [
          { route: 'Đam Rông ➡️ Đà Lạt', price: 250000 },
          { route: 'Đam Rông ➡️ Lâm Hà', price: 170000 },
          { route: 'Đam Rông ➡️ Đức Trọng', price: 200000 },
          { route: 'Đức Trọng ➡️ Đà Lạt', price: 150000 }
        ];
      } else {
        options = [
          { route: 'Đà Lạt ➡️ Đam Rông', price: 250000 },
          { route: 'Đà Lạt ➡️ Đức Trọng', price: 150000 },
          { route: 'Đức Trọng ➡️ Đam Rông', price: 200000 },
          { route: 'Lâm Hà ➡️ Đam Rông', price: 170000 }
        ];
      }
      
      var menuHtml = '';
      options.forEach(function(opt) {
        menuHtml += '<div class="zone-option" onclick="selectZoneOption(\''+opt.route+'\', '+opt.price+')">';
        menuHtml += '<span>'+opt.route+'</span>';
        menuHtml += '<span class="zone-price-tag">'+(opt.price/1000)+'k</span>';
        menuHtml += '</div>';
      });
      document.getElementById('ghep-zone-menu').innerHTML = menuHtml;
      
      document.getElementById('modal-ghep-booking').style.display = 'flex';
      selectZoneOption(options[0].route, options[0].price); // Select first by default
      
      renderSeatMap(d.seats);
    }
    
    function toggleZoneMenu() {
      var m = document.getElementById('ghep-zone-menu');
      m.style.display = (m.style.display === 'none' || m.style.display === '') ? 'flex' : 'none';
    }
    
    function selectZoneOption(route, price) {
      var hiddenInput = document.getElementById('ghep-zone');
      hiddenInput.value = price;
      hiddenInput.setAttribute('data-route', route);
      
      document.getElementById('ghep-zone-display').innerHTML = route + ' <span style="margin-left:auto;color:#fff;background:rgba(255,255,255,0.1);padding:2px 8px;border-radius:6px;font-size:0.85rem;">' + (price/1000) + 'k</span>';
      document.getElementById('ghep-zone-menu').style.display = 'none';
      
      var priceText = formatVND(price);
      document.getElementById('lbl-booking-summary').innerHTML = '<b>'+route+'</b><br>'+selectedCarpool.date+' lúc '+selectedCarpool.time+'<br>Giá: <span style="color:#FFD700;font-weight:800;font-size:1.2rem;">'+priceText+'</span>';
    }

    // Đóng menu nếu click ra ngoài
    document.addEventListener('click', function(e) {
      if (!e.target.closest('.custom-select-wrapper')) {
        var m = document.getElementById('ghep-zone-menu');
        if(m) m.style.display = 'none';
      }
    });

    function renderSeatMap(seatsAvailable) {
      var c = document.getElementById('visual-seat-map');
      var seatStyle = 'width:45px;height:45px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;cursor:pointer;transition:0.3s;border:2px solid transparent;';
      // Driver seat
      var html = '<div style="'+seatStyle+'background:transparent;border:1px dashed rgba(255,255,255,0.2);color:rgba(255,255,255,0.2);font-size:0.7rem;cursor:default;"><i class="fa-solid fa-user-tie"></i></div>';
      // Seat 1 (front passenger)
      var s1 = seatsAvailable >= 4 ? 'avail' : 'taken';
      html += seatBtn(1, s1);
      // Back row (3 seats)
      html += '<div style="grid-column:span 2;display:flex;justify-content:space-between;margin-top:5px;">';
      html += seatBtn(2, seatsAvailable >= 3 ? 'avail' : 'taken');
      html += seatBtn(3, seatsAvailable >= 2 ? 'avail' : 'taken');
      html += seatBtn(4, seatsAvailable >= 1 ? 'avail' : 'taken');
      html += '</div>';
      c.innerHTML = html;
    }

    function seatBtn(num, status) {
      var bg = status==='avail' ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.2)';
      var clr = status==='avail' ? '#22c55e' : '#ef4444';
      var border = status==='avail' ? 'rgba(34,197,94,0.2)' : 'transparent';
      var cursor = status==='avail' ? 'pointer' : 'not-allowed';
      return '<div id="seat-'+num+'" onclick="pickSeat('+num+',\''+status+'\')" style="width:45px;height:45px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-weight:700;cursor:'+cursor+';background:'+bg+';color:'+clr+';border:2px solid '+border+';transition:0.3s;">'+num+'</div>';
    }

    function pickSeat(num, status) {
      if (status === 'taken') return;
      selectedSeat = num;
      for (var i=1;i<=4;i++) {
        var el = document.getElementById('seat-'+i);
        if (!el) continue;
        if (i === num) {
          el.style.background = '#FFD700';
          el.style.color = '#000';
          el.style.borderColor = '#fff';
          el.style.boxShadow = '0 0 15px #FFD700';
        } else {
          el.style.boxShadow = 'none';
          // Reset to original
          var isAvail = el.style.cursor === 'pointer';
          if (isAvail) { el.style.background='rgba(34,197,94,0.1)'; el.style.color='#22c55e'; el.style.borderColor='rgba(34,197,94,0.2)'; }
        }
      }
    }

    async function confirmBookingCarpool() {
      if (!selectedSeat) { Swal.fire({icon:'warning',title:'Chưa chọn ghế',text:'Vui lòng chọn chỗ ngồi trên sơ đồ!',background:'#1e293b',color:'#fff'}); return; }
      var name = document.getElementById('ghep-name').value;
      var phone = document.getElementById('ghep-phone').value;
      var pickup = document.getElementById('ghep-pickup').value || 'Tại điểm hẹn';
      
      var sel = document.getElementById('ghep-zone');
      var selectedZoneRoute = sel.getAttribute('data-route');
      var priceText = formatVND(parseInt(sel.value));

      if (!name || !phone) { Swal.fire({icon:'warning',title:'Thiếu thông tin',text:'Vui lòng nhập tên và SĐT!',background:'#1e293b',color:'#fff'}); return; }
      Swal.fire({title:'Đang xử lý...',allowOutsideClick:false,didOpen:()=>Swal.showLoading(),background:'#1e293b',color:'#fff'});
      try {
        await fetch(BASE_URL, {
          method:'POST', headers:{'Content-Type':'text/plain'},
          body: JSON.stringify({action:'save_carpool',id:selectedCarpool.id,route:selectedZoneRoute,date:selectedCarpool.date,time:selectedCarpool.time,price:priceText,name:name,phone:phone,pickup:pickup,seatNumber:selectedSeat})
        });
        
        const zaloMsg = `Tôi muốn đăng ký ghế số ${selectedSeat} ghép xe chuyến: ${selectedZoneRoute} vào ngày ${selectedCarpool.date}, lúc ${selectedCarpool.time}. Đón tại: ${pickup}. Giá: ${priceText}`;
        const zaloUrl = `https://zalo.me/0915745030?text=${encodeURIComponent(zaloMsg)}`;
        
        Swal.fire({icon:'success',title:'Đăng ký thành công!',text:'Bảo An sẽ gọi lại cho bạn sớm nhất.',background:'#1e293b',color:'#fff'}).then(()=>{
          document.getElementById('modal-ghep-booking').style.display='none';
          window.open(zaloUrl, '_blank');
        });
      } catch(e) {
        Swal.fire({icon:'error',title:'Lỗi',text:'Vui lòng gọi Hotline: 0915.74.50.30',background:'#1e293b',color:'#fff'});
      }
    }

    document.addEventListener("DOMContentLoaded", () => {
      fetchSchedule();
    });

    async function fetchSchedule() {
      const syncIcon = document.getElementById("sync-icon");
      const syncText = document.getElementById("sync-text");
      
      // 1. SWR CACHE: Tải ngay dữ liệu cũ từ bộ nhớ đệm nếu có (Tốc độ 0 giây)
      const cachedData = localStorage.getItem('baoan_carpool_data');
      if (cachedData) {
        try {
          const parsedCache = JSON.parse(cachedData);
          if (parsedCache && parsedCache.length > 0) {
            carpoolData = parsedCache; // Nạp vào dữ liệu Modal
            renderTrips(parsedCache); // Vẽ giao diện ngay lập tức
            syncText.innerText = "Đang làm mới ngầm...";
          }
        } catch(e) {
          console.warn("Lỗi đọc cache", e);
        }
      }

      try {
        // Thử thách gọi API Google Sheets qua Apps Script
        if (APPS_SCRIPT_URL.indexOf("AKfycbx_XXX") > -1) {
          // Chưa cấu hình URL thực tế -> Dùng ngay dữ liệu Mock siêu sang
          setTimeout(() => {
            renderTrips(MOCK_TRIPS);
            syncIcon.classList.remove("rotating");
            syncIcon.className = "fa-solid fa-circle-check";
            syncIcon.style.color = "var(--success)";
            syncText.innerText = "Offline Mode (Mock)";
          }, 800);
          return;
        }

        // 2. CHẠY NGẦM: Vẫn tiếp tục lấy dữ liệu mới từ GAS
        const res = await fetch(APPS_SCRIPT_URL, { method: 'GET' });
        if (!res.ok) throw new Error("Network error");
        
        const rawData = await res.json();
        if (rawData && rawData.length > 0) {
          // NORMALIZE: Map GAS UPPERCASE keys → Frontend PascalCase
          const data = normalizeArray(rawData);
          carpoolData = data; // Lưu lại cho modal Lịch Xe Ghép
          localStorage.setItem('baoan_carpool_data', JSON.stringify(data)); // Cập nhật bộ nhớ đệm
          renderTrips(data);
          syncIcon.classList.remove("rotating");
          syncIcon.className = "fa-solid fa-circle-check";
          syncIcon.style.color = "var(--success)";
          syncText.innerText = "Đã đồng bộ Sheets";
        } else {
          showEmptyState();
        }
      } catch (err) {
        console.warn("Lỗi kết nối API, dùng dữ liệu Mock:", err);
        // Trình diễn dữ liệu mock mượt mà làm cứu cánh
        renderTrips(MOCK_TRIPS);
        syncIcon.classList.remove("rotating");
        syncIcon.className = "fa-solid fa-triangle-exclamation";
        syncIcon.style.color = "orange";
        syncText.innerText = "Dữ liệu đệm";
      }
    }

    function renderTrips(trips) {
      const container = document.getElementById("trip-list-container");
      container.innerHTML = "";

      trips.slice(0, 4).forEach(trip => {
        const isFull = parseInt(trip.SoGheTrong || '0') <= 0 || trip.TrangThai === "Đã đầy";
        const seatsText = isFull ? "Đã đầy ghế" : `Còn trống ${trip.SoGheTrong || '0'} ghế`;
        
        // Tạo dấu chấm tròn ghế trống trực quan
        let dotsHtml = "";
        const maxSeats = (trip.LoaiXe || '').indexOf("7") > -1 ? 6 : 4;
        const emptyCount = isFull ? 0 : parseInt(trip.SoGheTrong || '0');
        for(let i=0; i<maxSeats; i++) {
          const isTaken = i >= emptyCount;
          dotsHtml += `<div class="seat-dot ${isTaken ? 'taken' : ''}"></div>`;
        }

        // Tách biểu tượng mũi tên hoặc điểm đi/đến (SAFE SPLIT)
        let routeHtml = "";
        const routeParts = (trip.TuyenDuong || '').split(/➡️|->/);
        if (routeParts.length >= 2) {
          routeHtml = `
            <div class="route-step">
              <div class="route-icon-container"><i class="fa-solid fa-circle-dot"></i></div>
              <span>${routeParts[0].trim()}</span>
            </div>
            <div class="route-arrow"></div>
            <div class="route-step">
              <div class="route-icon-container"><i class="fa-solid fa-location-dot"></i></div>
              <span>${routeParts[1].trim()}</span>
            </div>
          `;
        } else {
          routeHtml = `
            <div class="route-step">
              <div class="route-icon-container"><i class="fa-solid fa-route"></i></div>
              <span>${trip.TuyenDuong}</span>
            </div>
          `;
        }

        // Tạo tin nhắn Zalo soạn sẵn chuyên nghiệp
        const zaloMessage = `Tôi muốn đăng ký ghép xe chuyến: ${trip.TuyenDuong || ''} vào ngày ${trip.Ngay || ''}, lúc ${trip.Gio || ''}. ID Chuyến: ${trip.ID || ''}`;
        const zaloUrl = `https://zalo.me/0915745030?text=${encodeURIComponent(zaloMessage)}`;

        const card = document.createElement("div");
        card.className = "trip-card";
        card.innerHTML = `
          <div class="trip-header">
            <div class="trip-time">
              <i class="fa-solid fa-clock"></i> ${trip.Gio || ''} - ${trip.Ngay || ''}
            </div>
            <div class="trip-car-type">${trip.LoaiXe || "Xe riêng"}</div>
          </div>
          
          <div class="trip-route">
            ${routeHtml}
          </div>
          
          <div class="trip-footer">
            <div class="price-container">
              <span class="price-label">Giá vé ghép</span>
              <span class="price-value">${trip.GiaGhep || '0đ'} <span class="price-unit">/ ghế</span></span>
            </div>
            
            <div class="seats-badge ${isFull ? 'full' : ''}">
              <div class="seats-dots">${dotsHtml}</div>
              <span>${seatsText}</span>
            </div>
          </div>
          
          <a href="${isFull ? '#' : zaloUrl}" class="btn-book-trip" style="${isFull ? 'opacity:0.5; cursor:not-allowed;' : ''}" ${isFull ? 'onclick="return false;"' : 'target="_blank"'}>
            <i class="fa-solid fa-paper-plane"></i> ${isFull ? 'HẾT CHỖ' : 'ĐẶT GHÉP QUA ZALO'}
          </a>
        `;
        container.appendChild(card);
      });
    }

    function showEmptyState() {
      const container = document.getElementById("trip-list-container");
      container.innerHTML = `
        <div class="empty-state">
          <i class="fa-solid fa-face-rolling-eyes"></i>
          <p style="font-weight:600; font-size:1rem;">Không có chuyến xe ghép nào</p>
          <p style="color:var(--text-muted); font-size:0.8rem; margin-top:5px;">Vui lòng quay lại sau hoặc liên hệ hotline để tạo chuyến mới!</p>
        </div>
      `;
    }
  