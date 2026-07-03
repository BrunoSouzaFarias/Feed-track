# Customização de Templates de E-mail do Firebase Auth

Este documento descreve como configurar e personalizar os templates de e-mail do Firebase Authentication para estarem em conformidade com a identidade visual e os padrões de design do **FEED-TRACK** (com a paleta executiva verde `#006c49` e estilo moderno).

---

## 🎨 Paleta de Cores e Identidade Visual

Para manter a consistência com o painel do FEED-TRACK, os e-mails utilizam a seguinte paleta:
- **Cor Primária (Liberty Green):** `#006c49`
- **Cor de Destaque (Acentuação):** `#0bbb81`
- **Cor de Fundo Principal:** `#f9f9fd`
- **Fundo do Card:** `#ffffff`
- **Texto Principal:** `#1a1c1f`
- **Texto Secundário:** `#505f76`
- **Borda/Divisor:** `#eeedf2`

---

## 📧 1. Template: Redefinição de Senha (Password Reset)

Este template é enviado quando um usuário solicita a recuperação da senha.

### Assunto Sugerido:
`🔒 Recuperação de Senha - FEED-TRACK`

### Código HTML/CSS (Inline):

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperar Senha - FEED-TRACK</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f9f9fd;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f9f9fd;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #eeedf2;
      box-shadow: 0 4px 12px rgba(0, 108, 73, 0.03);
      overflow: hidden;
    }
    .header {
      background-color: #006c49;
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .logo-highlight {
      color: #0bbb81;
    }
    .content {
      padding: 40px 32px;
    }
    h2 {
      color: #1a1c1f;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      color: #505f76;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-primary {
      background-color: #006c49;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      display: inline-block;
      box-shadow: 0 4px 6px rgba(0, 108, 73, 0.15);
      transition: background-color 0.2s;
    }
    .footer {
      background-color: #f3f3f7;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #eeedf2;
    }
    .footer-text {
      color: #97a5bd;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .divider {
      height: 1px;
      background-color: #eeedf2;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo-text">FEED<span class="logo-highlight">-TRACK</span></div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <h2>Olá,</h2>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta no FEED-TRACK. Clique no botão abaixo para escolher uma nova senha:</p>
        
        <div class="button-container">
          <a href="%LINK%" target="_blank" class="btn-primary">Redefinir Minha Senha</a>
        </div>
        
        <p>Se você não solicitou essa redefinição, pode ignorar este e-mail com segurança. Sua senha atual permanecerá inalterada.</p>
        
        <div class="divider"></div>
        
        <p style="font-size: 13px; color: #97a5bd;">Este link de recuperação expirará em breve para sua segurança.</p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">FEED-TRACK © 2026 // Liberty Seguros S.A.</p>
        <p class="footer-text" style="margin-top: 4px;">Plataforma de Desenvolvimento e Feedbacks Contínuos.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## 📧 2. Template: Confirmação de E-mail (Email Verification)

Enviado logo após a criação da conta para confirmar a validade do endereço de e-mail corporativo.

### Assunto Sugerido:
`✨ Confirme seu e-mail no FEED-TRACK`

### Código HTML/CSS (Inline):

```html
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verificar E-mail - FEED-TRACK</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f9f9fd;
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      table-layout: fixed;
      background-color: #f9f9fd;
      padding: 40px 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border-radius: 16px;
      border: 1px solid #eeedf2;
      box-shadow: 0 4px 12px rgba(0, 108, 73, 0.03);
      overflow: hidden;
    }
    .header {
      background-color: #006c49;
      padding: 32px;
      text-align: center;
    }
    .logo-text {
      color: #ffffff;
      font-size: 24px;
      font-weight: 800;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin: 0;
    }
    .logo-highlight {
      color: #0bbb81;
    }
    .content {
      padding: 40px 32px;
    }
    h2 {
      color: #1a1c1f;
      font-size: 20px;
      font-weight: 700;
      margin-top: 0;
      margin-bottom: 16px;
    }
    p {
      color: #505f76;
      font-size: 15px;
      line-height: 1.6;
      margin-top: 0;
      margin-bottom: 24px;
    }
    .button-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn-primary {
      background-color: #006c49;
      color: #ffffff !important;
      text-decoration: none;
      padding: 14px 28px;
      font-size: 14px;
      font-weight: 600;
      border-radius: 8px;
      display: inline-block;
      box-shadow: 0 4px 6px rgba(0, 108, 73, 0.15);
      transition: background-color 0.2s;
    }
    .footer {
      background-color: #f3f3f7;
      padding: 24px 32px;
      text-align: center;
      border-top: 1px solid #eeedf2;
    }
    .footer-text {
      color: #97a5bd;
      font-size: 12px;
      line-height: 1.5;
      margin: 0;
    }
    .divider {
      height: 1px;
      background-color: #eeedf2;
      margin: 24px 0;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="container">
      <!-- Header -->
      <div class="header">
        <div class="logo-text">FEED<span class="logo-highlight">-TRACK</span></div>
      </div>
      
      <!-- Content -->
      <div class="content">
        <h2>Seja bem-vindo(a) ao FEED-TRACK!</h2>
        <p>Agradecemos por se cadastrar na nossa plataforma de desenvolvimento contínuo. Para começar a registrar seus feedbacks e acompanhar seu PDI, confirme seu endereço de e-mail clicando no botão abaixo:</p>
        
        <div class="button-container">
          <a href="%LINK%" target="_blank" class="btn-primary">Confirmar Meu E-mail</a>
        </div>
        
        <p>Se você não criou uma conta no FEED-TRACK, apenas desconsidere esta mensagem.</p>
      </div>
      
      <!-- Footer -->
      <div class="footer">
        <p class="footer-text">FEED-TRACK © 2026 // Liberty Seguros S.A.</p>
        <p class="footer-text" style="margin-top: 4px;">Plataforma de Desenvolvimento e Feedbacks Contínuos.</p>
      </div>
    </div>
  </div>
</body>
</html>
```

---

## ⚙️ Como Aplicar no Firebase Console

Como o Firebase Authentication não suporta o envio direto de e-mails em formato HTML completo diretamente em contas gratuitas do plano Spark (ou possui certas restrições no console), você deve seguir o seguinte procedimento de integração:

### Opção A: Configuração via Firebase Console (Configurações Simples)
1. Vá até o [Firebase Console](https://console.firebase.google.com/).
2. Acesse **Authentication** > aba **Templates**.
3. Escolha o tipo de e-mail (Redefinição de senha ou Verificação de e-mail).
4. Clique no ícone de lápis para editar o template.
5. Insira os textos personalizados mantendo os placeholders `%LINK%` e `%APP_NAME%`.

### Opção B: Customização Avançada usando Servidor SMTP + Firebase Actions (Recomendado)
Para enviar e-mails HTML ricos idênticos aos códigos acima, utilize um serviço de envio (como Nodemailer, SendGrid ou Firebase Extension "Trigger Email") interceptando os links de ação gerados pelo Firebase:

1. **Gere o link no Frontend/Backend:**
   ```typescript
   import { auth } from './firebase';
   import { getActionCodeSettings } from 'firebase/auth';

   // Exemplo: Gerando link de redefinição de senha para enviar via API de e-mail própria
   const actionCodeSettings = {
     url: 'https://feed-track-dev.web.app/',
     handleCodeInApp: true,
   };
   const actionLink = await sendPasswordResetEmail(auth, email, actionCodeSettings);
   // Envie o actionLink em sua API para ser injetado no placeholder %LINK% do HTML
   ```

2. **Utilizando a Extensão "Trigger Email" (Firestore-based):**
   - Instale a extensão "Trigger Email from Firestore" no console do Firebase.
   - Sempre que precisar enviar um e-mail, grave um documento na coleção `mail` contendo o HTML customizado acima e as variáveis apropriadas.
