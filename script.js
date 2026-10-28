/* ==========================================================
   Contabilidad Administrativa | UMG
   script.js
   ========================================================== */

(function () {
  "use strict";

  // El HTML carga este archivo dos veces; esto evita iniciarlo doble.
  if (window.__contaAdminIniciado) return;
  window.__contaAdminIniciado = true;

  document.addEventListener("DOMContentLoaded", function () {
    iniciarMenu();
    iniciarSoluciones();
    iniciarCalculadora();
    iniciarBotonSubir();
    iniciarLogo();
    iniciarVisorImagenes();
    iniciarAparicion();
  });

  /* ---------- Menú responsive + enlace activo ---------- */
  function iniciarMenu() {
    var toggle = document.getElementById("menuToggle");
    var lista = document.getElementById("menuLista");
    if (!toggle || !lista) return;

    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", function () {
      var abierto = lista.classList.toggle("abierto");
      toggle.setAttribute("aria-expanded", String(abierto));
    });

    var enlaces = lista.querySelectorAll("a");

    // Cierra el menú al elegir una opción (móvil)
    enlaces.forEach(function (a) {
      a.addEventListener("click", function () {
        lista.classList.remove("abierto");
        toggle.setAttribute("aria-expanded", "false");
      });
    });

    // Resalta la sección visible
    if (!("IntersectionObserver" in window)) return;

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (!entrada.isIntersecting) return;
          enlaces.forEach(function (a) {
            a.classList.toggle(
              "activo",
              a.getAttribute("href") === "#" + entrada.target.id
            );
          });
        });
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );

    document.querySelectorAll("main section[id]").forEach(function (s) {
      observador.observe(s);
    });
  }

  /* ---------- Botones "Ver solución" ---------- */
  function iniciarSoluciones() {
    document.querySelectorAll(".btn-solucion").forEach(function (boton) {
      var destino = document.getElementById(boton.dataset.target);
      if (!destino) return;

      boton.setAttribute("aria-expanded", "false");

      boton.addEventListener("click", function () {
        var oculto = destino.hasAttribute("hidden");
        if (oculto) {
          destino.removeAttribute("hidden");
        } else {
          destino.setAttribute("hidden", "");
        }
        boton.textContent = oculto ? "Ocultar solución" : "Ver solución";
        boton.setAttribute("aria-expanded", String(oculto));
      });
    });
  }

  /* ---------- Calculadora de VAN y TIR ---------- */
  function iniciarCalculadora() {
    var boton = document.getElementById("btnCalcular");
    var salida = document.getElementById("resultado");
    if (!boton || !salida) return;

    var campos = ["inversion", "tasa", "flujos"].map(function (id) {
      return document.getElementById(id);
    });

    boton.addEventListener("click", calcular);
    campos.forEach(function (campo) {
      if (!campo) return;
      campo.addEventListener("keydown", function (e) {
        if (e.key === "Enter") calcular();
      });
    });

    function calcular() {
      var inversion = parseFloat(campos[0].value);
      var tasa = parseFloat(campos[1].value);
      var flujos = campos[2].value
        .split(",")
        .map(function (t) {
          return t.trim();
        })
        .filter(function (t) {
          return t !== "";
        })
        .map(Number);

      if (isNaN(inversion) || inversion <= 0) {
        return mostrarError("Escribe una inversión inicial mayor que cero.");
      }
      if (isNaN(tasa)) {
        return mostrarError("Escribe la tasa de descuento en porcentaje.");
      }
      if (flujos.length === 0 || flujos.some(isNaN)) {
        return mostrarError(
          "Escribe los flujos como números separados por coma. Ejemplo: 30000, 40000, 50000."
        );
      }

      var r = tasa / 100;
      var van = valorActualNeto(inversion, flujos, r);
      var tir = calcularTIR(inversion, flujos);

      var decision;
      var clase;
      if (Math.abs(van) < 0.005) {
        decision = "El VAN es cero: el proyecto es indiferente.";
        clase = "";
      } else if (van > 0) {
        decision = "El VAN es positivo: el proyecto genera valor y se acepta.";
        clase = "bueno";
      } else {
        decision = "El VAN es negativo: el proyecto destruye valor y se rechaza.";
        clase = "malo";
      }

      var textoTIR;
      if (tir === null) {
        textoTIR = "No se pudo calcular con estos flujos.";
      } else {
        var comparacion =
          tir > r ? "mayor que" : tir < r ? "menor que" : "igual a";
        textoTIR =
          (tir * 100).toFixed(2) +
          " % (" +
          comparacion +
          " la tasa de descuento de " +
          tasa +
          " %)";
      }

      salida.innerHTML =
        '<div class="res-caja ' +
        clase +
        '">' +
        "<p><strong>VAN:</strong> " +
        formatoQuetzales(van) +
        "</p>" +
        "<p><strong>TIR:</strong> " +
        textoTIR +
        "</p>" +
        "<p>" +
        decision +
        "</p>" +
        "</div>";
    }

    function mostrarError(mensaje) {
      salida.innerHTML = '<div class="res-error">' + mensaje + "</div>";
    }
  }

  // VAN = -I0 + suma de Ft / (1 + r)^t
  function valorActualNeto(inversion, flujos, r) {
    var total = -inversion;
    for (var t = 0; t < flujos.length; t++) {
      total += flujos[t] / Math.pow(1 + r, t + 1);
    }
    return total;
  }

  // TIR por bisección: tasa que hace el VAN igual a cero
  function calcularTIR(inversion, flujos) {
    var bajo = -0.99;
    var alto = 10; // 1000 %
    var vBajo = valorActualNeto(inversion, flujos, bajo);
    var vAlto = valorActualNeto(inversion, flujos, alto);

    if (vBajo * vAlto > 0) return null; // no hay cambio de signo

    for (var i = 0; i < 200; i++) {
      var medio = (bajo + alto) / 2;
      var vMedio = valorActualNeto(inversion, flujos, medio);
      if (Math.abs(vMedio) < 1e-7) return medio;
      if (vBajo * vMedio < 0) {
        alto = medio;
      } else {
        bajo = medio;
        vBajo = vMedio;
      }
    }
    return (bajo + alto) / 2;
  }

  function formatoQuetzales(valor) {
    var signo = valor < 0 ? "−" : "";
    return (
      signo +
      "Q" +
      Math.abs(valor).toLocaleString("es-GT", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })
    );
  }

  /* ---------- Logo interactivo ---------- */
  function iniciarLogo() {
    var logo = document.querySelector(".logo-header");
    if (!logo) return;

    logo.setAttribute("tabindex", "0");
    logo.setAttribute("role", "button");
    logo.title = "Ir al sitio de la UMG";

    function accion() {
      logo.classList.remove("girando");
      void logo.offsetWidth; // reinicia la animación
      logo.classList.add("girando");
      // Abre la página de la UMG en una pestaña nueva
      window.open("https://www.umg.edu.gt/", "_blank", "noopener");
    }

    logo.addEventListener("click", accion);
    logo.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        accion();
      }
    });
    logo.addEventListener("animationend", function () {
      logo.classList.remove("girando");
    });
  }

  /* ---------- Visor de imágenes de los anexos ---------- */
  function iniciarVisorImagenes() {
    var imagenes = document.querySelectorAll(".galeria img");
    if (!imagenes.length) return;

    var visor = null;

    function cerrar() {
      if (!visor) return;
      visor.remove();
      visor = null;
      document.removeEventListener("keydown", alTeclear);
    }

    function alTeclear(e) {
      if (e.key === "Escape") cerrar();
    }

    imagenes.forEach(function (img) {
      img.addEventListener("click", function () {
        cerrar();
        visor = document.createElement("div");
        visor.className = "visor";
        visor.setAttribute("role", "dialog");
        visor.setAttribute("aria-label", img.alt || "Imagen ampliada");
        var grande = document.createElement("img");
        grande.src = img.src;
        grande.alt = img.alt;
        visor.appendChild(grande);
        visor.addEventListener("click", cerrar);
        document.body.appendChild(visor);
        document.addEventListener("keydown", alTeclear);
      });
    });
  }

  /* ---------- Aparición de secciones al hacer scroll ---------- */
  function iniciarAparicion() {
    var secciones = document.querySelectorAll("main .seccion");
    var sinMovimiento = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (!("IntersectionObserver" in window) || sinMovimiento) return;

    var observador = new IntersectionObserver(
      function (entradas) {
        entradas.forEach(function (entrada) {
          if (entrada.isIntersecting) {
            entrada.target.classList.add("visible");
            observador.unobserve(entrada.target);
          }
        });
      },
      { threshold: 0.08 }
    );

    secciones.forEach(function (sec) {
      sec.classList.add("reveal");
      observador.observe(sec);
    });
  }

  /* ---------- Botón volver arriba ---------- */
  function iniciarBotonSubir() {
    var boton = document.getElementById("btnSubir");
    if (!boton) return;

    function actualizar() {
      boton.classList.toggle("visible", window.scrollY > 400);
    }

    window.addEventListener("scroll", actualizar, { passive: true });
    actualizar();

    boton.addEventListener("click", function () {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }
})();