# Litto – Clube do Livro 📚

> App web de clube do livro com mapa de bibliotecas públicas de São Paulo.
> Estética **neo-brutalista** · Firebase Auth · Leaflet Maps · SPA puro

---

[Relatório com Prompts e a Construção do Site](https://docs.google.com/document/d/1ideQjPIe4iG8YgkinwrDrprxIPqq8TlQd6oawwPcxhI/)

[Apresentação Canva]
(https://www.canva.com/design/DAHGadADBJU/qTKUUO15QA0woyfk9rbQXg/edit?utm_content=DAHGadADBJU&utm_campaign=designshare&utm_medium=link2&utm_source=sharebutton)

## Prompt original (reconstruído para referência)

```
Crie o design de um aplicativo web chamado "Litto" – um clube de livros.

IDENTIDADE VISUAL (Neo-Brutalismo):
- Fontes: Poppins (400, 500, 600, 700, 800, 900) para todos os textos
- Ícones: Material Symbols Outlined (Google)
- Paleta:
  · Primária (laranja): #fd711e
  · Secundária (amarelo): #ffdf2b
  · Terciária (azul): #5065ff
  · Fundo (creme): #FFFDF5
  · Superfície: #ffffff
  · Texto: #1a1b24
- Estilo: bordas sólidas pretas de 2–4px, sombras offset (4px 4px 0 0 #000),
  hover com sombra azul, botões com "press effect" (translate + remove shadow)
- Border-radius mínimo (0.125rem – quase quadrado)

TELAS:
1. Home / Perfil – avatar circular com borda, nome, @handle, bio, tags de gênero (chips coloridos), favoritos de filmes/séries, estante de livros (grid), recomendações cruzadas mídia→livro, avaliações com estrelas
2. Mapa – mapa interativo (Leaflet + OpenStreetMap) com marcadores de bibliotecas públicas de São Paulo, popup com nome e endereço
3. Perfil – estatísticas (livros lidos, avaliações, recomendações, quero ler)
4. Login – formulário com e-mail e senha, Firebase Auth
5. Cadastro – formulário com nome, e-mail, senha, confirmar senha, Firebase Auth

NAVEGAÇÃO:
- Header fixo: logo "Litto" em azul itálico + nav desktop
- Bottom nav fixo: ícones home, mapa, perfil, entrar
- SPA: troca apenas o conteúdo central, sem recarregar

ACESSIBILIDADE:
- Contraste mínimo 4.5:1
- Labels em todos os campos
- Atributos ARIA (aria-label, aria-describedby, aria-live, role)
- Compatible com deuteranopia / protanopia (sem dependência exclusiva de vermelho/verde)

IDIOMA: 100% português do Brasil
```

---

## Estrutura de pastas

```
litto/
├── index.html           ← entrada do app (SPA)
├── css/
│   └── style.css        ← todos os estilos (sem tema escuro)
├── js/
│   ├── firebase-config.js ← configuração Firebase (preencher credenciais)
│   ├── app.js           ← navegação, validação, autenticação
│   └── mapa.js          ← lógica do Leaflet + bibliotecas de SP
├── assets/              ← ícones ou imagens (opcional)
└── README.md
```

---

## Configuração do Firebase

### 1. Criar projeto
1. Acesse [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clique em **Adicionar projeto** e siga as etapas
3. Em **Authentication** → **Método de login** → habilite **E-mail/senha**

### 2. Obter credenciais
1. Em **Configurações do projeto** (⚙️) → **Seus aplicativos** → clique em `</>`
2. Registre o app com um apelido (ex: "litto-web")
3. Copie o objeto `firebaseConfig`

### 3. Preencher `js/firebase-config.js`
Substitua os placeholders pelos valores copiados:

```js
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "litto-xxxxx.firebaseapp.com",
  projectId:         "litto-xxxxx",
  storageBucket:     "litto-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abcdef"
};
```

### 4. Regras de domínio
No Firebase → Authentication → **Domínios autorizados**, adicione:
- `localhost` (para testes locais)
- `seu-projeto.vercel.app` (após o deploy)

---

## Mapa de Bibliotecas

O mapa usa **Leaflet** + tiles gratuitos do **OpenStreetMap** (sem chave de API).

As 10 bibliotecas pré-definidas estão em `js/mapa.js` no array `BIBLIOTECAS_SP`. Para adicionar mais:

```js
{
  nome: "Nome da Biblioteca",
  endereco: "Endereço completo",
  lat: -23.XXXX,
  lng: -46.XXXX
}
```

Coordenadas podem ser obtidas em [https://www.openstreetmap.org](https://www.openstreetmap.org) clicando com o botão direito no local.

---

## Deploy na Vercel

1. Instale a CLI: `npm i -g vercel`
2. Na raiz do projeto: `vercel`
3. Siga as instruções (framework: **Other**, output: raiz `/`)
4. Adicione o domínio gerado ao Firebase (Authentication → Domínios autorizados)

Ou faça upload manual em [https://vercel.com/new](https://vercel.com/new) → **Import Git Repository** ou arraste a pasta.

> **Nota:** Como o projeto usa `type="module"` nos scripts, ele precisa ser servido via HTTP (não abre direto como arquivo local no navegador). Use `npx serve .` ou `python -m http.server` para testar localmente.

---

## Tecnologias

| Tecnologia | Uso |
|---|---|
| HTML5 / CSS3 | Estrutura e estilos |
| JavaScript (ES Modules) | Lógica, navegação SPA |
| Firebase Auth (SDK 10) | Autenticação email/senha |
| Leaflet 1.9.4 | Mapa interativo |
| OpenStreetMap | Tiles gratuitos para o mapa |
| Poppins + Material Symbols | Fontes e ícones (Google) |

---

© 2026 Litto Book Club. Cultivando histórias.
