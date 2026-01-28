/* =========================================================
  LEGACY CRM — JS (Con mejoras UX: Chunking + Postel)
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
}

function randomFail(prob=0.25){
  return Math.random() < prob;
}

/* ========================================================
   MEJORA POSTEL: VALIDACIÓN TOLERANTE
   ======================================================== */
function validateClientForm(){
  const name = $("#c_name").value.trim();
  const tax  = $("#c_tax").value.trim();
  const email= $("#c_email").value.trim();
  const phoneRaw = $("#c_phone").value.trim(); // Entrada cruda del usuario
  const industry = $("#c_industry").value.trim();
  const type = $("#c_type").value.trim();
  const address = $("#c_address").value.trim();
  const notes = $("#c_notes").value.trim();
  const consent = $("#c_consent").checked;
  const captcha = $("#c_captcha").value.trim();

  const errors = [];

  // LEY DE POSTEL (NOMBRE): 
  // Antes: No se admitía Ñ. Ahora: Se acepta UTF-8 (solo validamos longitud mínima).
  if(name.length < 2) errors.push("Nombre muy corto.");

  // LEY DE POSTEL (TELÉFONO): "Sé liberal en lo que aceptas"
  // Paso 1: Limpiar la entrada (Sanitización)
  // Eliminamos espacios, guiones, paréntesis. Dejamos dígitos y el signo +
  const phoneClean = phoneRaw.replace(/[^0-9+]/g, '');

  // Paso 2: Validar el dato limpio en lugar del dato crudo
  // Si tiene al menos 7 dígitos, lo damos por válido.
  if(phoneClean.length < 7){
    errors.push("Teléfono inválido (revise los números).");
  } else {
    // Simulamos que el sistema "guarda" la versión limpia
    console.log("Teléfono saneado para DB:", phoneClean);
  }

  // Resto de validaciones (aún tóxicas porque así es el ejercicio)
  if(!/^\d{13,15}$/.test(tax)) errors.push("ID fiscal inválido.");
  if(!email.includes("@") || email.endsWith("@gmail.com")) errors.push("Correo corporativo requerido (sin gmail).");
  
  if(!industry) errors.push("Industria no seleccionada.");
  if(!type) errors.push("Tipo de cliente no seleccionado.");
  if(address.length < 120) errors.push("Dirección demasiado corta (<120).");
  if(notes.length < 8) errors.push("Notas internas insuficientes.");
  if(!consent) errors.push("Falta consentimiento.");

  // Captcha cambia cuando envías
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
  $("#c_captcha").placeholder = `¿Cuánto es ${a}+${b}? (a veces cambia)`;
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
  
  // Regresar al paso 1 al resetear (Chunking)
  changeStep(1);
}

function simulateSlowTask(label="Procesando..."){
  toast(label, "Espere… (sin barra real)");
  return new Promise(res=> setTimeout(res, 900 + Math.random()*1400));
}

function setLastAction(){
  state.lastActionAt = Date.now();
}

function startAutoLogoutWatcher(){
  setInterval(()=>{
    const sec = (Date.now() - state.lastActionAt)/1000;
    if(sec > state.autoLogoutSec){
      toast("Sesión expirada", "Vuelve a iniciar sesión (se perdieron cambios).");
      addFriction(12, "Cierre de sesión automático excesivo.");
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
    addFriction(4, "Salir no confirma, genera incertidumbre.");
    toast("Salir", "Sesión cerrada (¿o no?)");
  });

  $("#btnHelp").addEventListener("click", ()=>{
    addFriction(2, "Ayuda genérica e inútil.");
    toast("Ayuda", "Para resolver errores, contacte a TI (respuesta estándar).");
  });

  $("#btnSync").addEventListener("click", async ()=>{
    addFriction(3, "Sincronización manual innecesaria.");
    await simulateSlowTask("Sincronizando");
    toast("Listo", "Sincronización completada (tal vez).");
  });

  $("#globalSearch").addEventListener("input", (e)=>{
    if(e.target.value.length > 10){
      addFriction(3, "Búsqueda sin resultados útiles.");
    }
  });

  // CLIENTES
  rotateCaptcha();
  $("#btnSubmitClient").addEventListener("click", async ()=>{
    rotateCaptcha(); // Captcha cambia justo al enviar
    addFriction(4, "Enviar sin guardado automático ni progreso claro.");
    await simulateSlowTask("Validando");

    if(randomFail(0.20)){
      toast("Error 500", "Servidor no disponible. Intente más tarde.");
      addFriction(8, "Error del sistema sin alternativa.");
      return;
    }

    const errors = validateClientForm();
    if(errors.length){
      toast("Error en formulario", errors[0] + " (hay más)");
      addFriction(5, "Errores encontrados."); // Bajamos fricción aquí porque la validación es mejor
      return;
    }

    toast("Éxito", "Cliente enviado. (Saneamiento aplicado).");
    // "Castigo" aleatorio removido parcialmente por buena UX
    if(randomFail(0.55)){
      showModalSurvey(true);
    }
  });

  $("#btnCancelClient").addEventListener("click", ()=>{
    resetClientFormHard();
    addFriction(6, "Cancelar borró todo sin confirmación.");
    toast("Cancelado", "Se borraron datos.");
  });

  $("#btnPrintClient").addEventListener("click", ()=>{
    addFriction(2, "Acción irrelevante.");
    toast("Imprimir", "Enviando a impresora.");
  });

  $("#btnHiddenSave").addEventListener("click", async ()=>{
    await simulateSlowTask("Guardando");
    toast("Guardado", "Borrador guardado localmente (no es seguro).");
    state.draft.client = {
      name: $("#c_name").value,
      email: $("#c_email").value,
      notes: $("#c_notes").value
    };
  });

  // OPORTUNIDADES
  $("#btnNewOpp").addEventListener("click", ()=>{
    showModalSurvey(false);
    toast("Nueva oportunidad", "Función en construcción.");
  });
  $("#btnExport").addEventListener("click", async ()=>{
    await simulateSlowTask("Exportando");
    toast("Exportado", "Archivo generado: reporte.csvv");
  });

  // CONFIG & REPORTES
  $("#btnApplyConfig").addEventListener("click", ()=>{
    const v = Number($("#autoLogout").value);
    state.autoLogoutSec = v;
    toast("Configuración aplicada", `Auto-cierre: ${v} segundos.`);
  });
  $("#btnNuke").addEventListener("click", ()=>{
    toast("Restablecer", "Se restableció TODO.");
    resetClientFormHard();
  });
  $("#btnRunReport").addEventListener("click", async ()=>{
    $("#reportOutput").textContent = "Generando…";
    await simulateSlowTask("Generando reporte");
    $("#reportOutput").textContent = "Reporte: Actividad del CRM\n- Datos desactualizados.\n";
  });
  $("#btnRunReport2").addEventListener("click", async ()=>{
    $("#reportOutput").textContent = "Cargando (lento)…";
    await new Promise(r=>setTimeout(r, 2500 + Math.random()*2000));
    $("#reportOutput").textContent = "Reporte lento finalizado.";
  });

  // MODAL
  $("#modalX").addEventListener("click", ()=>{
    hideModalSurvey();
    toast("Aviso", "Puede que haya perdido cambios.");
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
   LÓGICA: CONTROL DE PASOS DEL FORMULARIO (Chunking)
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

// Iniciar en el paso 1
changeStep(1);
init();