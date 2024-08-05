importScripts('./psl.min.js');
console.log("Content script loaded");
const default_result = {
  score: 0,
  thirdPartyScripts: "null",
  httpsUsed: "null",
  cookiesUsed: "null"
};

function analyzeWebpage() {
  const thirdPartyScripts = document.querySelectorAll('script[src^="http"]:not([src*="' + window.location.hostname + '"])').length;
  const httpsUsed = window.location.protocol === 'https:';
  const cookiesUsed = document.cookie.length > 0;
  
  const score = calculateScore(thirdPartyScripts, httpsUsed, cookiesUsed);
  
  return {
    score: score,
    thirdPartyScripts: thirdPartyScripts,
    httpsUsed: httpsUsed,
    cookiesUsed: cookiesUsed
  };
}

function calculateScore(thirdPartyScripts, httpsUsed, cookiesUsed) {
  let score = 100;
  
  if (thirdPartyScripts > 5) score -= 20;
  if (!httpsUsed) score -= 30;
  if (cookiesUsed) score -= 10;
  
  return Math.max(0, score);
}

// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//   if (request.action === "analyze") {
//     const result = analyzeWebpage();
//     sendResponse(result);
//   }
//   return true;
// });


/**
 *  分割线
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "analyze") {
    const result = loadInfo(request.tab);
    sendResponse(result);
  }
  return true;
})



function tosDrCallback(json, domain, sld) {
  if (json.parameters.services.length === 0) {
      console.log(`service ${domain} not found on tosdr`);
      return default_result;
  }
  let service = json.parameters.services.find(service => service.urls.includes(sld || domain));
  if (service === undefined) {
      console.log(`matching service for ${domain} on tosdr.org not found`);
      return default_result;
  }
  console.log(service);
  let data = { name: service.name, rating: service.rating, id: service.id};
  //setExtensionIcon(data);
  chrome.storage.local.set({ [domain]: data }, function () {
      console.log(`saved ${domain} - ${service.rating.letter}`);
  });
  let result = default_result;
  result.score = data.score
  return result;
}

function loadGrade(domain, sld, tabId) {
  chrome.storage.local.get([domain], data => {
      // if (typeof data[domain] !== 'undefined') {
      //     setExtensionIcon(data[domain], tabId);
      //     return;
      // }
      fetch(`https://api.tosdr.org/search/v4/?query=${domain}`).then((response) => {
          if (response.status !== 200) {
              console.log(`Could not query tosdr. Status Code: ${response.status}`);
              return default_result;
          }
          response.json().then(json => {
              let result = tosDrCallback(json, domain, sld);
              if (result.score === 0) {
                  //chrome.action.setIcon({path: `../img/logo-grade-f.png`, tabId: tabId});
                  return default_result;
              }
              return result;
          });                 
      });
  });
}

function parseUrl(url) {
  let urlobj = new URL(url);
  let parsed = psl.parse(urlobj.hostname);
  console.log(parsed);
  return parsed;
}

function loadInfo(tab) {
  let tabUrl = tab.url;
  // if (tabUrl.startsWith('chrome://')) {
  //     //chrome.action.setIcon({path: `../img/logo-32x32.png`, tabId: tab.id});
  //     return;
  // }
  let parsedDomain = parseUrl(tabUrl);
  let domain = parsedDomain.domain;
  if (domain !== undefined) {
      return loadGrade(domain, domain.sld, tab.id);
  } else {
      console.log(`website not found: ${url}`);
      //chrome.action.setIcon({path: `../img/logo-32x32.png`, tabId: tab.id});
      return default_result;
  }
}


console.log("Content script loaded");