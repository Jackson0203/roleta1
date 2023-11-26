const express = require('express');
const puppeteer = require('puppeteer');

const app = express();
const resultados = [];

app.set('view engine', 'ejs');
app.set('views', 'templates');

app.get('/', (req, res) => {
  const resultadosPorData = agruparResultadosPorData(resultados);
  res.render('index', { resultados_por_data: resultadosPorData });
});

async function coletarDados() {
  while (true) {
    try {
      const resultado = await obterResultadoRoleta();
      resultados.push(resultado);
      console.log(`Novo resultado coletado: ${JSON.stringify(resultado)}`);

      await aguardar(9850); // Aguarda 30 segundos antes de buscar o próximo resultado

      await aguardar(30000); // Aguarda 30 segundos antes de buscar o próximo resultado
    } catch (error) {
      console.error('Erro durante a coleta de dados:', error.message);
      break;
    }
  }
}

async function obterResultadoRoleta() {
  const today = new Date().toISOString().split('T')[0];
  const url = 'https://casino.betfair.com/pt-br/c/roleta';

  const rouletteNumber = await obterNumeroRoleta(url);
  const currentTime = new Date().toLocaleTimeString();

  return { data: today, conteudo: `${currentTime}: ${rouletteNumber}` };
}

async function obterNumeroRoleta(url, maxTentativas = 5) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  // Ajuste o tempo limite de navegação para 150 segundos
  await page.setDefaultNavigationTimeout(150000);

  await page.goto(url, { waitUntil: 'load' });

  let tentativa = 1;
  let rouletteElement;

  // Loop de tentativas
  while (tentativa <= maxTentativas) {
    try {
      rouletteElement = await page.$x('//*[@id="root"]/div/div[1]/div[1]/div/div[2]/div/div[2]/div/div[1]/div[1]/div/span[1]');
      if (rouletteElement.length > 0) {
        break; // Elemento encontrado, saia do loop
      }

      console.log(`Tentativa ${tentativa}: Elemento da roleta não encontrado. Tentando novamente...`);
      tentativa++;

      // Aguarde um curto período entre as tentativas
      await aguardar(3000);

      // Recarregue a página para tentar novamente
      await page.reload({ waitUntil: 'load' });
    } catch (error) {
      console.error('Erro durante a tentativa:', error.message);
      break;
    }
  }

  if (rouletteElement && rouletteElement.length > 0) {
    const rouletteNumber = await rouletteElement[0].evaluate((el) => el.textContent.trim());
    await browser.close();
    return rouletteNumber;
  } else {
    console.log(`Número máximo de tentativas (${maxTentativas}) atingido. Elemento da roleta não encontrado.`);
    await browser.close();
    throw new Error('Elemento da roleta não encontrado após várias tentativas');
  }
}

function aguardar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function agruparResultadosPorData(resultados) {
  const resultadosPorData = {};
  resultados.forEach((resultado) => {
    const { data, conteudo } = resultado;
    resultadosPorData[data] = resultadosPorData[data] || [];
    resultadosPorData[data].push(conteudo);
  });
  return resultadosPorData;
}

if (require.main === module) {
  const coletaThread = coletarDados();

  const server = app.listen(0, () => {
    const port = server.address().port;
    console.log(`Servidor iniciado em http://localhost:${port}`);
  });
}
