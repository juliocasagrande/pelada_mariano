async function carregarGastos() {
  const urlGastos = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTUJmQbstUcf0r1dmmucbx0sn5qwUElZeGLTe5OBcIAxc2Kz_AmBoBX1bfOI4Ev-yAminlpdx01bbY-/pub?gid=110850147&single=true&output=csv';

  const response = await fetch(urlGastos);
  const csv = await response.text();
  const dados = Papa.parse(csv, { header: true, skipEmptyLines: true }).data;

  const dadosTratados = dados
    .filter(linha => linha["Data"] && linha["Valor (R$)"])
    .map(linha => {
      const tipo = linha["Tipo"]?.toLowerCase().trim();

      // Tratamento do valor
      const valorStr = linha["Valor (R$)"]
        .replace(/[R$\s]/g, '') // remove R$ e espaços
        .replace(/\./g, '')     // remove pontos de milhar
        .replace(',', '.');     // troca vírgula por ponto decimal
      const valor = parseFloat(valorStr);

      // Tratamento da data
      const partesData = linha["Data"].split('/');
      const dataObj = new Date(`${partesData[2]}-${partesData[1]}-${partesData[0]}`);

      return {
        ...linha,
        Data: dataObj,
        Valor: tipo === "entrada" ? valor : -valor,
        Tipo: tipo === "entrada" ? "Entrada" : "Saída",
        MesAno: dataObj.getFullYear() + "-" + String(dataObj.getMonth() + 1).padStart(2, "0"),
        MesTexto: dataObj.toLocaleString("pt-BR", { month: "long" }),
        Ano: dataObj.getFullYear(),
        Dia: dataObj.toLocaleDateString("pt-BR")
      };
    });

  renderizarGrafico(dadosTratados);
  renderizarTabela(dadosTratados);
}

function renderizarGrafico(dados) {
  const dadosAgrupados = {};
  dados.forEach(linha => {
    const key = linha.MesAno;
    if (!dadosAgrupados[key]) {
      dadosAgrupados[key] = 0;
    }
    dadosAgrupados[key] += linha.Valor;
  });

  const labels = Object.keys(dadosAgrupados).sort();
  const valoresMensais = labels.map(key => dadosAgrupados[key]);

  // Calcular saldo acumulado
  const valoresAcumulados = [];
  let saldo = 0;
  for (let valor of valoresMensais) {
    saldo += valor;
    valoresAcumulados.push(saldo);
  }

  const labelsFormatados = labels.map(item => {
    const [ano, mes] = item.split("-");
    const nomeMes = new Date(ano, mes - 1).toLocaleString("pt-BR", { month: "long" });
    return `${ano}-${nomeMes}`;
  });

  new Chart(document.getElementById("graficoSaldo").getContext("2d"), {
    type: "line",
    data: {
      labels: labelsFormatados,
      datasets: [{
        label: "Saldo acumulado",
        data: valoresAcumulados,
        fill: true,
        backgroundColor: "rgba(77, 244, 0, 0.2)",
        borderColor: "rgb(46, 250, 0)",
        tension: 0.3,
        pointRadius: 4
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          display: false,
        },
        
      }
    }
  });
}


function renderizarTabela(dados) {
  const container = document.getElementById("tabela-gastos");
  container.innerHTML = "";

  const dadosPorMes = {};
  dados.forEach(dado => {
    const chave = `${dado.Ano}-${String(dado.Data.getMonth() + 1).padStart(2, "0")}`;
    if (!dadosPorMes[chave]) {
      dadosPorMes[chave] = [];
    }
    dadosPorMes[chave].push(dado);
  });

  Object.keys(dadosPorMes).sort().forEach(mes => {
    const entradas = dadosPorMes[mes].filter(e => e.Tipo === "Entrada").reduce((s, d) => s + d.Valor, 0);
    const saidas = dadosPorMes[mes].filter(e => e.Tipo === "Saída").reduce((s, d) => s + d.Valor, 0);
    const total = entradas + saidas;

    const nomeMes = new Date(mes + "-01").toLocaleString("pt-BR", { year: "numeric", month: "long" });

    const expander = document.createElement("details");
    const resumo = document.createElement("summary");
    resumo.innerHTML = `<strong>${nomeMes}</strong> - Subtotal: R$ ${total.toFixed(2)}`;
    expander.appendChild(resumo);

    const lista = document.createElement("ul");
    dadosPorMes[mes].forEach(item => {
      const li = document.createElement("li");
      li.textContent = `${item.Dia} - ${item.Descrição} - ${item.Tipo} - R$ ${Math.abs(item.Valor).toFixed(2)}`;
      lista.appendChild(li);
    });
    expander.appendChild(lista);
    container.appendChild(expander);
  });
}

window.addEventListener("DOMContentLoaded", carregarGastos);
