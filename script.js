/* =========================================================
  LEGACY CRM — JS (Con Mejoras UX: Chunking + Postel + Fitts)
  Objetivo original: provocar fricción.
  Objetivo actual: Mejorar Clientes sin romper lo demás.
========================================================= */

const state = {
  route: "dashboard",
  friction: 8,       // 0..100
  captchaAnswer: 12, // 7+5 inicial
  autoLogoutSec: 30,
  lastActionAt: Date.now(),
  forcedSurveyCount: 0,
  draft: {
    client: {}
  }
};

const $ = (q) => document.querySelector(q);

function clamp(n,min,max){ return Math.max(min, Math.min(max, n)); }

function addFriction(points, reason){
  state.friction = clamp(state.friction + points, 0, 100);
  $("#frictionBar").style.width = state.friction + "%";
  $("#frictionTxt").textContent = `Fricción: ${state.friction}% (${labelFriction(state.friction)})`;
  if(reason){
    toast("Fricción aumentó", reason + ` (+${points}%)`);
  }
  if(state.friction >= 65){
    toast("Riesgo de abandono", "Usuarios reales abandonarían aquí. (Simulación)");
  }
  if(state.friction >= 85){
    showModalSurvey(true);
  }
}

function labelFriction(v){
  if(v < 15) return "tolerable";
  if(v < 35) return "molesta";
  if(v < 65) return "alta";
  if(v < 85) return "crítica";
  return "abandono inminente";
}

function toast(title, msg){
  const t = $("#toast");
  $("#toastTitle").textContent = title;
  $("#toastMsg").textContent = msg;
  t.style.display = "block";
  clearTimeout(toast._timer);
  toast._timer = setTimeout(()=> t.style.display="none", 3500);
}

function setActiveMenu(route){
  document.querySelectorAll(".menu a").forEach(a=>{
    a.classList.toggle("active", a.dataset.route === route);
  });
}

function showView(route){
  state.route = route;
  setActiveMenu(route);
  document.querySelectorAll("main .view").forEach(v => v.style.display="none");
  const el = $("#view-" + route);
  if(el) el.style.display = "block";
  addFriction(2, "Navegación confusa: cambiaste de sección y perdiste contexto.");
}

function routeFromHash(){
  const h = (location.hash || "#dashboard").replace("#","");
  const valid = ["dashboard","clientes","oportunidades","config","reportes"];
  return valid.includes(h) ? h : "dashboard";
}

window.addEventListener("hashchange", ()=>{
  showView(routeFromHash());
});

function seedTables(){
  const activity = [
    ["Cliente creado", "admin", "OK", "Proceso completado"],
    ["Oportunidad editada", "ventas1", "WARNING", "No se guardó por algo"],
    ["Exportación", "ventas2", "ERROR", "Archivo .csvv inválido"],
    ["Login", "admin", "OK", "Sesión expira pronto"],
    ["Sincronización", "sistema", "TIMEOUT", "Reintente manualmente"]
  ];
  const tb = $("#activityTbody");
  tb.innerHTML = "";
  activity.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r[0]}</td>
      <td>${r[1]}</td>
      <td><span class="tag ${r[2]==="OK"?"ok":(r[2]==="WARNING"?"warn":"bad")}">${r[2]}</span></td>
      <td>${r[3]}</td>
    `;
    tb.appendChild(tr);
  });

  const opps = [
    ["Acme S.A.", "$12,000", "30%", "Prospección", "Editar | Cerrar | ???"],
    ["NovaRetail", "$1,500", "80%", "Negociación", "Editar | Cerrar | ???"],
    ["EduPlus", "$7,200", "15%", "Calificación", "Editar | Cerrar | ???"],
    ["LogiTruck", "$42,000", "55%", "Propuesta", "Editar | Cerrar | ???"]
  ];
  const ob = $("#oppsTbody");
  ob.innerHTML = "";
  opps.forEach(r=>{
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r[0]} <div class="tag warn">sin seguimiento</div></td>
      <td>${r[1]}</td>
      <td>${r[2]}</td>
      <td>${r[3]}</td>
      <td style="color:var(--muted)">${r[4]}</td>
    `;
    ob.appendChild(tr);
  });
}

function randomFail(prob=0.25){
  return Math.random() < prob;
}

/* =========================================================
   MEJORA 2: VALIDACIÓN TOLERANTE (LEY DE POSTEL)
   ========================================================= */
function validateClientForm(){
  const name = $("#c_name").value.trim();
  const tax  = $("#c_tax").value.trim();
  const email= $("#c_email").value.trim();
  const phoneRaw = $("#c_phone").value.trim(); // Raw input
  const industry = $("#c_industry").value.trim();
  const type = $("#c_type").value.trim();
  const address = $("#c_address").value.trim();
  const notes = $("#c_notes").value.trim();
  const consent = $("#c_consent").checked;
  const captcha = $("#c_captcha").value.trim();

  const errors = [];

  // POSTEL: Nombre flexible
  if(name.length < 2) errors.push("Nombre muy corto.");

  // POSTEL: Limpieza de teléfono
  const phoneClean = phoneRaw.replace(/[^0-9+]/g, '');
  if(phoneClean.length < 7){
    errors.push("Teléfono inválido (mínimo 7 dígitos).");
  } else {
    console.log("Teléfono saneado:", phoneClean);
  }

  // Validaciones estándar
  if(!/^\d{13,15}$/.test(tax)) errors.push("ID fiscal inválido.");
  if(!email.includes("@") || email.endsWith("@gmail.com")) errors.push("Correo corporativo requerido (sin gmail).");
  if(!industry) errors.push("Industria no seleccionada.");
  if(!type) errors.push("Tipo de cliente no seleccionado.");
  if(address.length < 120) errors.push("Dirección demasiado corta (<120).");
  if(notes.length < 8) errors.push("Notas internas insuficientes.");
  if(!consent) errors.push("Debe aceptar el consentimiento.");

  // Captcha
  const expected = state.captchaAnswer;
  const parsed = Number(captcha);
  if(!Number.isFinite(parsed) || parsed !== expected){
    errors.push("Captcha incorrecto (probablemente cambió).");
  }

  return errors;
}

function rotateCaptcha(){
  const a = Math.floor(3 + Math.random()*9);
  const b = Math.floor(3 + Math.random()*9);
  state.captchaAnswer = a + b;
  $("#c_captcha").placeholder = `¿Cuánto es ${a}+${b}?`;
}

function showModalSurvey(force=false){
  const bd = $("#modalBackdrop");
  if(force || state.forcedSurveyCount < 2){
    bd.style.display = "flex";
    bd.setAttribute("aria-hidden","false");
    state.forcedSurveyCount++;
    addFriction(6, "Interrupción: encuesta obligatoria en mal momento.");
  }
}

function hideModalSurvey(){
  const bd = $("#modalBackdrop");
  bd.style.display = "none";
  bd.setAttribute("aria-hidden","true");
}

function resetClientFormHard(){
  ["#c_name","#c_tax","#c_email","#c_phone","#c_address","#c_notes","#c_captcha"].forEach(id=> $(id).value = "");
  $("#c_industry").value = "";
  $("#c_type").value = "";
  $("#c_consent").checked = false;
  
  // Regresar al paso 1 al limpiar
  changeStep(1);
}

function simulateSlowTask(label="Procesando..."){
  toast(label, "Espere… (sin barra real)");
  return new Promise(res=> setTimeout(res, 900 + Math.random()*1400));
}

function setLastAction(){
  state.lastActionAt = Date.now();
}

// Auto-logout
function startAutoLogoutWatcher(){
  setInterval(()=>{
    const sec = (Date.now() - state.lastActionAt)/1000;
    if(sec > state.autoLogoutSec){
      toast("Sesión expirada", "Vuelve a iniciar sesión.");
      addFriction(12, "Cierre de sesión automático.");
      location.hash = "#dashboard";
      state.lastActionAt = Date.now();
      showModalSurvey(true);
    }
  }, 1000);
}

function init(){
  seedTables();
  showView(routeFromHash());
  $("#frictionBar").style.width = state.friction + "%";
  $("#frictionTxt").textContent = `Fricción: ${state.friction}% (${labelFriction(state.friction)})`;

  document.addEventListener("click", setLastAction, true);
  document.addEventListener("keydown", setLastAction, true);

  $("#btnLogout").addEventListener("click", ()=>{
    addFriction(4, "Salir no confirma.");
    toast("Salir", "Sesión cerrada.");
  });

  $("#btnHelp").addEventListener("click", ()=>{
    addFriction(2, "Ayuda genérica.");
    toast("Ayuda", "Contacte a TI.");
  });

  $("#btnSync").addEventListener("click", async ()=>{
    addFriction(3, "Sync manual.");
    await simulateSlowTask("Sincronizando");
    toast("Listo", "Sincronización completada.");
  });

  $("#globalSearch").addEventListener("input", (e)=>{
    if(e.target.value.length > 10){
      addFriction(3, "Búsqueda inútil.");
    }
  });

  // CLIENTES (Botón Enviar - Ahora es #btnSubmitClient pero estilo Hero)
  rotateCaptcha();
  $("#btnSubmitClient").addEventListener("click", async ()=>{
    rotateCaptcha(); 
    // Bajamos la fricción porque ahora el botón es bueno
    // addFriction(4, "Enviar..."); 
    
    await simulateSlowTask("Validando");

    if(randomFail(0.10)){ // Bajamos probabilidad de fallo para recompensar UX
      toast("Error 500", "Fallo simulado.");
      return;
    }

    const errors = validateClientForm();
    if(errors.length){
      toast("Corrija:", errors[0]);
      // addFriction(5, "Errores...");
      return;
    }

    toast("Éxito", "Cliente enviado correctamente.");
    // No mostramos encuesta molesta al tener éxito
  });

  // CLIENTES (Botón Cancelar - Ahora #btnCancelClient estilo texto)
  $("#btnCancelClient").addEventListener("click", ()=>{
    if(confirm("¿Seguro que desea borrar el formulario?")){
        resetClientFormHard();
        toast("Cancelado", "Formulario limpio.");
    }
  });

  $("#btnPrintClient").addEventListener("click", ()=>{
    toast("Imprimir", "Enviando a impresora.");
  });

  // OPORTUNIDADES
  $("#btnNewOpp").addEventListener("click", ()=>{
    showModalSurvey(false);
    toast("Nueva oportunidad", "En construcción.");
  });
  $("#btnExport").addEventListener("click", async ()=>{
    await simulateSlowTask("Exportando");
    toast("Exportado", "reporte.csvv generado.");
  });

  // CONFIG & REPORTES
  $("#btnApplyConfig").addEventListener("click", ()=>{
    const v = Number($("#autoLogout").value);
    state.autoLogoutSec = v;
    toast("Config aplicada", `Auto-cierre: ${v}s.`);
  });
  $("#btnNuke").addEventListener("click", ()=>{
    toast("Restablecer", "Todo borrado.");
    resetClientFormHard();
  });
  $("#btnRunReport").addEventListener("click", async ()=>{
    $("#reportOutput").textContent = "Generando…";
    await simulateSlowTask("Generando");
    $("#reportOutput").textContent = "Reporte generado (datos falsos).";
  });
  $("#btnRunReport2").addEventListener("click", async ()=>{
    $("#reportOutput").textContent = "Cargando…";
    await new Promise(r=>setTimeout(r, 3000));
    $("#reportOutput").textContent = "Reporte lento finalizado.";
  });

  // MODAL
  $("#modalX").addEventListener("click", ()=>{
    hideModalSurvey();
    toast("Aviso", "Cambios perdidos.");
  });
  $("#btnModalLater").addEventListener("click", ()=>{
    hideModalSurvey();
    setTimeout(()=> showModalSurvey(false), 3500);
  });
  $("#btnModalSubmit").addEventListener("click", ()=>{
    hideModalSurvey();
    toast("Gracias", "Encuesta enviada.");
  });

  startAutoLogoutWatcher();
}

/* =========================================================
   MEJORA 1: CONTROL DE PASOS (Chunking)
   ========================================================= */

let currentStep = 1;

window.changeStep = function(step) {
  document.querySelectorAll('.form-step').forEach(el => {
    el.style.display = 'none';
  });
  const activeStep = document.getElementById('step-' + step);
  if (activeStep) {
    activeStep.style.display = 'block';
  }
  currentStep = step;
  updateProgressBar(step);
};

function updateProgressBar(step) {
  const bar = document.getElementById('progressBar');
  const labels = document.querySelectorAll('.progress-labels span');
  
  let percentage = 33;
  if (step === 2) percentage = 66;
  if (step === 3) percentage = 100;

  bar.style.width = percentage + '%';

  labels.forEach((label, index) => {
    if (index + 1 === step) {
      label.classList.add('active-label');
      label.style.fontWeight = 'bold';
      label.style.color = '#fff';
    } else {
      label.classList.remove('active-label');
      label.style.fontWeight = 'normal';
      label.style.color = '#666';
    }
  });
}

// Iniciar paso 1
changeStep(1);
init();