# Central Shalom - Sistema de Gestão de Ministérios

![Status](https://img.shields.io/badge/Status-Em_Desenvolvimento-blue)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=flat&logo=firebase&logoColor=black)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)

## 📌 Sobre o Projeto

O **Central Shalom** é uma aplicação web completa desenvolvida para automatizar, centralizar e gerenciar as operações e escalas de uma comunidade religiosa. 

Inicialmente construído para resolver os gargalos operacionais do **Ministério de Liturgia** (agendamento de missas, solicitações de sacramentos e escalas sacerdotais), o sistema foi arquitetado com uma base escalável. Atualmente, encontra-se em fase de expansão para se tornar o hub central de **todos os ministérios** da comunidade (Música, Comunicação, Acolhimento, Intercessão, Eventos, etc.), permitindo que diferentes coordenadores gerenciem suas próprias demandas e equipes em um único ecossistema seguro.

## 🚀 Principais Funcionalidades

* **Autenticação e Controle de Acesso (RBAC):**
    * Login seguro via Google Auth (Firebase).
    * Sistema de níveis estritos: Master Admin (Super Administrador), Coordenadores (Admin) e Membros.
    * Distribuição de credenciais (tags) por ministério, limitando a visualização de abas e aprovações apenas aos gestores responsáveis.
* **Gestão de Equipe e Sacerdotes:**
    * Aprovação manual de novos usuários para garantir a segurança da plataforma.
    * Área isolada para a Gestão Clerical (Sacerdotes), com fichas cadastrais contendo disponibilidade de escala, paróquia e aniversários de ordenação.
* **Agenda Litúrgica Inteligente:**
    * Painel interativo (visão em calendário e em lista) para organização de missas e designação de sacerdotes.
    * **Integração com WhatsApp:** Geração automática de relatórios de missas sem sacerdote escalado e envio direto via WhatsApp Web/App com um clique.
* **Fluxo de Solicitações (Kanban):**
    * Painel de aprovação para coordenadores gerenciarem pedidos (deferido, indeferido, pendente).
    * Regras de negócio de tempo dinâmicas (ex: bloqueio de agendamentos com menos de 45 dias de antecedência, com exceções sistêmicas para "Visita aos Doentes").
* **Notificações em Tempo Real:**
    * Sistema de sininho e alertas para manter os usuários atualizados sobre o status de seus requerimentos.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React (com Vite), TypeScript.
* **Estilização:** Tailwind CSS (interfaces fluidas, modernas e responsivas).
* **Ícones:** Lucide React.
* **Backend as a Service (BaaS):** Firebase.
    * *Authentication:* Gestão de usuários e login social.
    * *Firestore:* Banco de dados NoSQL em tempo real. Regras de segurança (Firestore Rules) customizadas no servidor para impedir escalonamento de privilégios e garantir a privacidade dos dados ministeriais.

## 🛣️ Roadmap e Próximos Passos

- [x] Módulo Base e Autenticação.
- [x] Módulo de Liturgia (Formulários, Painel de Aprovação e Agenda).
- [x] Módulo Clerical (Ficha de Sacerdotes e Integração WhatsApp).
- [ ] **Expansão Multi-Ministério:** Criação de formulários de solicitação dinâmicos específicos para Música (escalas de bandas), Eventos (reserva de salas) e Comunicação (pedidos de artes).
- [ ] Dashboards estatísticos para o Master Admin (volume de atendimentos, engajamento por ministério).

Desenvolvido com foco em usabilidade, segurança de dados e eficiência pastoral.