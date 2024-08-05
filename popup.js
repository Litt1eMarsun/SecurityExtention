document.addEventListener('DOMContentLoaded', () => {
  const analyzeButton = document.getElementById('analyzeButton');
  const detailResultDiv = document.getElementById('detailResult');
  let myChart;

  // 默认打开Display标签
  document.getElementById('displayTab').addEventListener('click', function(event) {
    openTab(event, 'Display');
  });

  document.getElementById('detailTab').addEventListener('click', function(event) {
    openTab(event, 'Detail');
  });

  // 初始化时显示默认的饼图
  //initDefaultChart();

  /*
  在刚加载页面的时候就发送消息给content
  */

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const activeTab = tabs[0];
    
    if (activeTab && activeTab.url.startsWith("http")) {
      chrome.tabs.sendMessage(activeTab.id, { action: "analyze", tabId: activeTab.id, tab: tabs }, (response) => {
        if (chrome.runtime.lastError) {
          detailResultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
        } else if (response && response.score !== undefined) {
          displayResult(response);
        } else {
          detailResultDiv.textContent = 'Error: Unable to analyze the page.';
        }
      });
    } else {
      detailResultDiv.textContent = "Cannot analyze this page. Only http/https pages are supported.";
    }
  });
  
  
  


  analyzeButton.addEventListener('click', () => {
    detailResultDiv.textContent = 'Analyzing...';
    
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      const activeTab = tabs[0];
      
      if (!activeTab.url.startsWith("http")) {
        detailResultDiv.textContent = "Cannot analyze this page. Only http/https pages are supported.";
        return;
      }

      chrome.tabs.sendMessage(activeTab.id, { action: "analyze", tabId: activeTab.id, tab: activeTab }, (response) => {
        if (chrome.runtime.lastError) {
          console.log(chrome.runtime.lastError.message);
          
          chrome.tabs.executeScript(activeTab.id, {file: 'content.js'}, () => {
            if (chrome.runtime.lastError) {
              detailResultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
            } else {
              chrome.tabs.sendMessage(activeTab.id, {action: "analyze",tabId: tabs[0].id ,tab: tabs}, (response) => {
                if (chrome.runtime.lastError) {
                  detailResultDiv.textContent = 'Error: ' + chrome.runtime.lastError.message;
                } else {
                  displayResult(response);
                }
              });
            }
          });
        } else if (response && response.score !== undefined) {
          displayResult(response);
        } else {
          detailResultDiv.textContent = 'Error: Unable to analyze the page.';
        }
      });
    });
  });




  
  //分割线

  function initDefaultChart() {
        const defaultScore = 50; // 默认分数
    const defaultGrade = getGrade(defaultScore);
    updateChart(defaultScore, defaultGrade);
  }

  function displayResult(response) {
    const score = response.score;
    let grade = getGrade(score);
    
    // 更新饼图
    updateChart(score, grade);

    // 更新详细信息
    detailResultDiv.innerHTML = `
      <h3>Security Score: ${score}/100</h3>
      <h3>Grade: ${grade}</h3>
      <p>Third-party scripts: ${response.thirdPartyScripts}</p>
      <p>HTTPS used: ${response.httpsUsed ? 'Yes' : 'No'}</p>
      <p>Cookies used: ${response.cookiesUsed ? 'Yes' : 'No'}</p>
    `;
  }

  function getGrade(score) {
    if (score >= 80) return 'A';
    else if (score >= 60) return 'B';
    else if (score >= 40) return 'C';
    else if (score >= 20) return 'D';
    else return 'E';
  }

  function updateChart(score, grade) {
    const ctx = document.getElementById('securityChart').getContext('2d');
    
    if (myChart) {
      myChart.destroy();
    }

    myChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [score, 100 - score],
          backgroundColor: ['#36A2EB', '#FFFFFF']
        }]
      },
      options: {
        cutoutPercentage: 70,
        responsive: true,
        maintainAspectRatio: false,
        legend: {
          display: false
        },
        tooltips: {
          enabled: false
        },
        elements: {
          center: {
            text: grade,
            color: '#36A2EB',
            fontStyle: 'Arial',
            sidePadding: 30,
            minFontSize: 25,
            lineHeight: 25
          }
        }
      },
      plugins: [{
        beforeDraw: function(chart) {
          if (chart.config.options.elements.center) {
            var ctx = chart.ctx;
            var centerConfig = chart.config.options.elements.center;
            var fontSize = (chart.height / 114).toFixed(2);
            ctx.font = fontSize + "em " + centerConfig.fontStyle;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            var text = centerConfig.text;
            var centerX = ((chart.chartArea.left + chart.chartArea.right) / 2);
            var centerY = ((chart.chartArea.top + chart.chartArea.bottom) / 2);
            ctx.fillStyle = centerConfig.color;
            ctx.fillText(text, centerX, centerY);
          }
        }
      }]
    });
  }
});

function openTab(evt, tabName) {
  var i, tabcontent, tablinks;
  tabcontent = document.getElementsByClassName("tabcontent");
  for (i = 0; i < tabcontent.length; i++) {
    tabcontent[i].style.display = "none";
  }
  tablinks = document.getElementsByClassName("tablinks");
  for (i = 0; i < tablinks.length; i++) {
    tablinks[i].className = tablinks[i].className.replace(" active", "");
  }
  document.getElementById(tabName).style.display = "block";
  evt.currentTarget.className += " active";
}
