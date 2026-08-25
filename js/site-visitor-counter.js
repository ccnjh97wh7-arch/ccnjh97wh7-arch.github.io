import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  doc,
  getDoc,
  getFirestore,
  increment,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCw64gMvjhoKGwOlkTEF8Krvk3VX1KVup4",
  authDomain: "rocky-taylor-memorial.firebaseapp.com",
  projectId: "rocky-taylor-memorial",
  storageBucket: "rocky-taylor-memorial.firebasestorage.app",
  messagingSenderId: "1082208747146",
  appId: "1:1082208747146:web:5eee9fb14e2ef853d03773"
};

const visitorCounterKey = "eric-site-visitor-counter-v1";
const visitorCounterDoc = doc(getFirestore(initializeApp(firebaseConfig)), "site_stats", "visitor_counter");

function getFooterContainer() {
  const footerBottoms = Array.from(document.querySelectorAll("footer .footer-bottom"));
  if (footerBottoms.length > 0) {
    return footerBottoms[footerBottoms.length - 1];
  }

  return document.querySelector("footer") || document.body;
}

function canUseStorage() {
  try {
    const probeKey = "__visitor_counter_probe__";
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch (error) {
    return false;
  }
}

function hasCountedThisBrowser() {
  if (!canUseStorage()) {
    return false;
  }

  return window.localStorage.getItem(visitorCounterKey) === "1";
}

function markCountedThisBrowser() {
  if (!canUseStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(visitorCounterKey, "1");
  } catch (error) {
    // Ignore storage failures and keep the counter best-effort.
  }
}

function formatCount(value) {
  const numericValue = Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  const digits = String(numericValue);
  return digits.padStart(Math.max(6, digits.length), "0");
}

function ensureWidget() {
  const container = getFooterContainer();
  let widget = container.querySelector("[data-site-visitor-widget]");

  if (widget) {
    return widget;
  }

  widget = document.createElement("div");
  widget.className = "site-visitor-widget";
  widget.dataset.siteVisitorWidget = "true";
  widget.setAttribute("aria-label", "Site visitor count");
  widget.innerHTML = [
    '<span class="site-visitor-label">VISITORS</span>',
    '<output class="site-visitor-odometer" data-site-visitor-count aria-live="polite">000000</output>'
  ].join("");
  container.appendChild(widget);
  return widget;
}

function setWidgetCount(widget, count) {
  const counter = widget.querySelector("[data-site-visitor-count]");
  if (counter) {
    counter.textContent = formatCount(count);
  }
}

async function readCount() {
  try {
    const snapshot = await getDoc(visitorCounterDoc);
    if (!snapshot.exists()) {
      return 0;
    }

    const count = Number(snapshot.data()?.count);
    return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0;
  } catch (error) {
    return 0;
  }
}

async function incrementCount() {
  await setDoc(
    visitorCounterDoc,
    {
      count: increment(1),
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
}

async function initVisitorCounter() {
  const widget = ensureWidget();
  const currentCount = await readCount();
  setWidgetCount(widget, currentCount);

  if (hasCountedThisBrowser()) {
    return;
  }

  try {
    await incrementCount();
    markCountedThisBrowser();
    const updatedCount = await readCount();
    setWidgetCount(widget, updatedCount || currentCount + 1);
  } catch (error) {
    // If the backend is unavailable, keep the existing count display.
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initVisitorCounter, { once: true });
} else {
  void initVisitorCounter();
}