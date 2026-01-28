/* =========================================================
  LEGACY CRM — JS (malo a propósito)
  Objetivo: provocar fricción y abandono.
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
  // Simula abandono
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
  // mala práctica: cada cambio sube fricción
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
    ["Cliente creado", "admin", "OK", "Proceso completado (¿seguro?)"],
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
      <td>
        <span class="tag ${r[2]==="OK"?"ok":(r[2]==="WARNING"?"warn":"bad")}">${r[2]}</span>
      </td>
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

function validateClientForm(){
  // Validación tardía y cruel: se ejecuta al final
  const name = $("#c_name").value.trim();
  const tax  = $("#c_tax").value.trim();
  const email= $("#c_email").value.trim();
  const phone= $("#c_phone").value.trim();
  const industry = $("#c_industry").value.trim();
  const type = $("#c_type").value.trim();
  const address = $("#c_address").value.trim();
  const notes = $("#c_notes").value.trim();
  const consent = $("#c_consent").checked;
  const captcha = $("#c_captcha").value.trim();

  const errors = [];

  if(name.length < 6) errors.push("Nombre legal incompleto.");
  if(!/^\d{13,15}$/.test(tax)) errors.push("ID fiscal inválido.");
  if(!email.includes("@") || email.endsWith("@gmail.com")) errors.push("Correo corporativo requerido (sin gmail).");
  if(!/^\+\d{8,15}$/.test(phone)) errors.push("Teléfono inválido (E.164).");
  if(!industry) errors.push("Industria no seleccionada.");
  if(!type) errors.push("Tipo de cliente no seleccionado.");
  if(address.length < 120) errors.push("Dirección demasiado corta (<120).");
  if(notes.length < 8) errors.push("Notas internas insuficientes.");
  if(!consent) errors.push("Falta consentimiento (no indicamos dónde).");

  // Captcha cambia cuando envías: mala práctica
  const expected = state.captchaAnswer;
  const parsed = Number(captcha);
  if(!Number.isFinite(parsed) || parsed !== expected){
    errors.push("Captcha incorrecto (probablemente cambió).");
  }

  return errors;
}

function rotateCaptcha(){
  // Cambia la pregunta de captcha sin avisar
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
  // Cancelar borra TODO sin confirmación (mala UX)
  ["#c_name","#c_tax","#c_email","#c_phone","#c_address","#c_notes","#c_captcha"].forEach(id=> $(id).value = "");
  $("#c_industry").value = "";
  $("#c_type").value = "";
  $("#c_consent").checked = false;
  
  // ADD: Regresar al paso 1 al resetear
  changeStep(1);
}

function simulateSlowTask(label="Procesando..."){
  toast(label, "Espere… (sin barra real)");
  return new Promise(res=> setTimeout(res, 900 + Math.random()*1400));
}

function setLastAction(){
  state.lastActionAt = Date.now();
}

// Auto-logout absurdo (provoca abandono)
function startAutoLogoutWatcher(){
  setInterval(()=>{
    const sec = (Date.now() - state.lastActionAt)/1000;
    if(sec > state.autoLogoutSec){
      toast("Sesión expirada", "Vuelve a iniciar sesión (se perdieron cambios).");
      addFriction(12, "Cierre de sesión automático excesivo.");
      // Simula "logout"
      location.hash = "#dashboard";
      state.lastActionAt = Date.now();
      showModalSurvey(true);
    }
  }, 1000);
}

function init(){
  seedTables();

  // Routing inicial
  showView(routeFromHash());

  // Fricción inicial
  $("#frictionBar").style.width = state.friction + "%";
  $("#frictionTxt").textContent = `Fricción: ${state.friction}% (${labelFriction(state.friction)})`;

  // Eventos globales
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
    if(randomFail(0.35)){
      toast("Error", "Sincronización fallida. Intente nuevamente.");
      addFriction(5, "Fallo sin guía.");
    }else{
      toast("Listo", "Sincronización completada (tal vez).");
    }
  });

  $("#globalSearch").addEventListener("input", (e)=>{
    // Búsqueda "mala": a veces "rompe"
    if(e.target.value.length > 10){
      addFriction(3, "Búsqueda sin resultados útiles y sin filtros.");
      if(randomFail(0.25)){
        toast("Error", "Búsqueda fallida por razón desconocida.");
        addFriction(4, "Error sin recuperación.");
      }
    }
  });

  // CLIENTES
  rotateCaptcha();
  $("#btnSubmitClient").addEventListener("click", async ()=>{
    // Captcha cambia justo al enviar: mala UX
    rotateCaptcha();

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
      addFriction(9, "Validación tardía: errores al final.");
      // "Castigo": se borra un campo al azar
      const fields = ["#c_address","#c_notes","#c_tax","#c_phone"];
      const pick = fields[Math.floor(Math.random()*fields.length)];
      $(pick).value = "";
      addFriction(4, "El sistema borró un campo sin aviso.");
      return;
    }

    toast("Éxito", "Cliente enviado. Puede tardar 24h en aparecer.");
    addFriction(2, "Éxito poco confiable: confirmación débil.");
    if(randomFail(0.55)){
      showModalSurvey(true);
    }
  });

  $("#btnCancelClient").addEventListener("click", ()=>{
    resetClientFormHard();
    addFriction(6, "Cancelar borró todo sin confirmación.");
    toast("Cancelado", "Se borraron datos. No hay deshacer.");
  });

  $("#btnPrintClient").addEventListener("click", ()=>{
    addFriction(2, "Acción irrelevante para el flujo.");
    toast("Imprimir", "Enviando a impresora predeterminada (si existe).");
  });

  // "Guardar" escondido (no salva realmente)
  $("#btnHiddenSave").addEventListener("click", async ()=>{
    addFriction(3, "Guardar escondido; usuario lo descubre tarde.");
    await simulateSlowTask("Guardando");
    toast("Guardado", "Borrador guardado localmente (no es seguro).");
    // Guarda solo algunos campos (mala práctica)
    state.draft.client = {
      name: $("#c_name").value,
      email: $("#c_email").value,
      notes: $("#c_notes").value
    };
  });

  // OPORTUNIDADES
  $("#btnNewOpp").addEventListener("click", ()=>{
    addFriction(5, "Crear oportunidad sin asistente ni guía.");
    showModalSurvey(false);
    toast("Nueva oportunidad", "Función en construcción.");
  });
  $("#btnExport").addEventListener("click", async ()=>{
    addFriction(4, "Exportación extraña (.csvv) sin explicación.");
    await simulateSlowTask("Exportando");
    toast("Exportado", "Archivo generado: reporte.csvv (¿qué es esto?)");
  });

  // CONFIG
  $("#btnApplyConfig").addEventListener("click", ()=>{
    const v = Number($("#autoLogout").value);
    state.autoLogoutSec = v;
    addFriction(3, "Config peligrosa: auto-logout absurdo confirmado.");
    toast("Configuración aplicada", `Auto-cierre: ${v} segundos.`);
  });
  $("#btnNuke").addEventListener("click", ()=>{
    addFriction(10, "Acción destructiva sin confirmación.");
    toast("Restablecer", "Se restableció TODO (no se puede deshacer).");
    resetClientFormHard();
  });

  // REPORTES
  $("#btnRunReport").addEventListener("click", async ()=>{
    addFriction(3, "Reporte sin filtros ni explicación.");
    $("#reportOutput").textContent = "Generando…";
    await simulateSlowTask("Generando reporte");
    if(randomFail(0.30)){
      $("#reportOutput").textContent = "ERROR: No se pudo generar el reporte.\nSugerencia: intente en otro horario.";
      addFriction(7, "Reporte falla sin diagnóstico.");
    }else{
      $("#reportOutput").textContent =
        "Reporte: Actividad del CRM\n" +
        "- Clientes nuevos: ???\n" +
        "- Oportunidades: 4\n" +
        "- Conversión: N/A\n" +
        "- Nota: Datos desactualizados.\n";
    }
  });

  $("#btnRunReport2").addEventListener("click", async ()=>{
    addFriction(4, "Reporte lento sin feedback real.");
    $("#reportOutput").textContent = "Cargando (lento)…";
    await new Promise(r=>setTimeout(r, 2500 + Math.random()*2000));
    $("#reportOutput").textContent = "Reporte lento finalizado.\n(El usuario ya abandonó.)";
    addFriction(5, "Tiempo de espera alto (abandono).");
  });

  // Modal encuesta (intrusivo)
  $("#modalX").addEventListener("click", ()=>{
    addFriction(4, "Cerrar encuesta penaliza al usuario.");
    hideModalSurvey();
    toast("Aviso", "Puede que haya perdido cambios.");
  });
  $("#btnModalLater").addEventListener("click", ()=>{
    addFriction(3, "Posponer no respeta al usuario: insistirá.");
    hideModalSurvey();
    setTimeout(()=> showModalSurvey(false), 3500);
  });
  $("#btnModalSubmit").addEventListener("click", ()=>{
    const q1 = $("#m_q1").value;
    const q2 = $("#m_q2").value;
    const c  = $("#m_comment").value.trim();
    if(!q1 || !q2 || c.length < 80){
      addFriction(6, "Encuesta con requisitos excesivos.");
      toast("Error", "Complete la encuesta correctamente (mín. 80 caracteres).");
      return;
    }
    hideModalSurvey();
    toast("Gracias", "Encuesta enviada (nada cambia).");
    addFriction(2, "Encuesta irrelevante al objetivo del usuario.");
  });

  // Disparador de "exit intent" (abandono)
  document.addEventListener("mousemove", (e)=>{
    if(e.clientY < 20 && state.friction > 40 && randomFail(0.25)){
      showModalSurvey(true);
    }
  });

  // Auto logout watcher
  startAutoLogoutWatcher();

  // Recordatorio de "guardado" escondido
  setInterval(()=>{
    if(state.route === "clientes" && randomFail(0.35)){
      toast("Consejo", "¿Ya intentaste guardar? (botón escondido).");
      addFriction(2, "Sistema no guía de forma adecuada.");
    }
  }, 12000);
}

/* =========================================================
   NUEVA LÓGICA: CONTROL DE PASOS DEL FORMULARIO
   ========================================================= */

let currentStep = 1;

window.changeStep = function(step) {
  // 1. Ocultar todos los pasos
  document.querySelectorAll('.form-step').forEach(el => {
    el.style.display = 'none';
  });

  // 2. Mostrar el paso actual
  const activeStep = document.getElementById('step-' + step);
  if (activeStep) {
    activeStep.style.display = 'block';
  }

  // 3. Actualizar estado interno
  currentStep = step;

  // 4. Actualizar Barra de Progreso
  updateProgressBar(step);
};

function updateProgressBar(step) {
  const bar = document.getElementById('progressBar');
  const labels = document.querySelectorAll('.progress-labels span');
  
  // Calcular porcentaje (3 pasos)
  let percentage = 33;
  if (step === 2) percentage = 66;
  if (step === 3) percentage = 100;

  bar.style.width = percentage + '%';

  // Actualizar negritas en los labels
  labels.forEach((label, index) => {
    if (index + 1 === step) {
      label.classList.add('active-label');
      label.style.fontWeight = 'bold';
      label.style.color = '#333';
    } else {
      label.classList.remove('active-label');
      label.style.fontWeight = 'normal';
      label.style.color = '#999';
    }
  });
}

init();