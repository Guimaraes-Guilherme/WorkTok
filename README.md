# WorkTok

Rede social de profissões em formato de rolagem: **TikTok + LinkedIn**.
Vídeos, fotos e vagas da sua área num feed vertical, perfil com 3 vídeos de apresentação e chat com regras próprias.

App em **React Native (Expo SDK 58 + Expo Router)**, servidor em **Supabase** (banco Postgres, login, arquivos e chat em tempo real).

---

## O que já funciona

| Área | Funcionalidades |
|---|---|
| Conta | Cadastro (Profissional, Recrutador/RH ou Empresa), login, recuperar senha, sair |
| Onboarding | Escolha de até 3 áreas — define o feed |
| Feed | Vídeos e fotos em tela cheia, abas **Pra você** (sua área) e **Seguindo**, vídeo toca só quando está na tela, toque para pausar, curtir, comentar, salvar, compartilhar, carregamento infinito |
| Vagas no feed | A cada 4 posts aparece uma vaga da sua área, com "combina com seu perfil" e **Candidatar em 1 toque** |
| Aba Vagas | Busca por cargo, filtro por área, "Candidaturas" (com status) para profissionais e "Minhas vagas" para recrutadores |
| Postar | Botões **Publicar foto** e **Publicar vídeo** (até 3 min). Recrutador/empresa tem também **Publicar vaga** |
| Vaga por link | Usuário comum só divulga vaga colando um **link externo** no post |
| Perfil | Foto, profissão, bio, números, skills, selo "aberto a oportunidades", **caixa de Apresentação com 3 vídeos de até 3 min**, abas Publicações / Salvos / Curtidos |
| Perfil de outra pessoa | Seguir, Mensagem / Entrar em contato, assistir apresentações |
| Chat | Lista com filtros (Todas, Recrutadores, Não lidas), mensagens em tempo real, "lida", vaga relacionada no topo |
| Regra do chat | Só conversa quem **se segue mutuamente**, ou **recrutador/empresa → candidato** |
| Recrutador | Vê candidatos da vaga, muda status (em análise, entrevista...), conversa, encerra/reabre vaga |
| Busca | Estilo TikTok: buscas recentes, vagas em alta, resultados em Pessoas / Posts / Vagas |

As regras importantes (quem publica vaga, quem pode conversar, limite de 3 min, link externo) são garantidas **no banco de dados**, não só no app — ninguém consegue burlar pelo código.

---

## Como rodar (passo a passo)

> **Já configurado:** o projeto Supabase **WorkTok** (região São Paulo) já está ativo com todo o banco instalado, e o `.env.example` já vem com a URL e a chave dele. Basta copiar `.env.example` para `.env` e pular para o passo 3. Os passos 1 e 2 abaixo servem só se você quiser montar outro projeto do zero.

### 1. Criar o projeto no Supabase (grátis)
1. Acesse https://supabase.com, crie uma conta e clique em **New project**.
2. Quando o projeto abrir, vá em **SQL Editor → New query**.
3. Copie todo o conteúdo de [`supabase/schema.sql`](supabase/schema.sql), cole e clique em **Run**.
4. (Recomendado para testes) Em **Authentication → Sign In / Providers → Email**, desligue **Confirm email** — assim o cadastro entra direto, sem precisar confirmar por e-mail.

### 2. Pegar as chaves
Em **Project Settings → API** copie:
- **Project URL**
- **anon public key**

Na pasta do projeto, copie `.env.example` para `.env` e preencha:

```
EXPO_PUBLIC_SUPABASE_URL=https://SEU-PROJETO.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anon-publica
```

### 3. Rodar o app
Precisa do [Node.js 20+](https://nodejs.org).

```bash
npm install
npx expo start
```

Instale o app **Expo Go** no celular e escaneie o QR code que aparece no terminal (no iPhone é preciso entrar com a mesma conta Expo no computador, com `npx expo login`, e no app).

**Sem celular / sem Expo Go:** rode `npx expo start --web` (ou aperte `w` com o servidor rodando) e o WorkTok abre no navegador. Dica: no Chrome, aperte F12 e ative o modo celular (Ctrl+Shift+M) para ver o app no formato de tela de telefone.

> Para testar o chat e as regras, crie duas ou três contas (uma delas como **Recrutador/RH**).

---

## Estrutura do código

```
src/
  app/                  telas (cada arquivo é uma rota)
    (tabs)/             barra de baixo: Início, Vagas, +, Chat, Perfil
    login, cadastro, onboarding
    perfil/[id]         perfil de outra pessoa
    vaga/[id]           detalhes da vaga + candidatos (para quem publicou)
    chat/[id]           conversa
    novo/               publicar foto, vídeo, vaga e apresentação
    busca, comentarios/[id], post/[id], editar-perfil
  components/           peças reutilizáveis (feed, perfil, listas, UI)
  lib/                  supabase, login, consultas (api.ts), upload, tema
supabase/schema.sql     banco, regras de segurança e funções
```

## Próximos passos sugeridos
- **Ponto 3:** definir em detalhe os dois lados do app (profissional × recrutador/empresa) e a verificação de contas de empresa.
- **Vaga em vídeo** (deixada para depois).
- Vídeos em escala: trocar o armazenamento simples por **Mux** ou **Cloudflare Stream** (compressão e qualidade adaptável) quando o número de usuários crescer.
- Notificações push (nova mensagem, nova candidatura).
- Login com Google/Apple.
- Moderação e denúncia de conteúdo.
- Publicar nas lojas com **EAS Build** (`npx eas-cli@latest build`).
