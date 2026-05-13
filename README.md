# 30X Kapso Workflows

Workflows y funciones para el bot de ventas 30X sobre la plataforma Kapso.

## Estructura

```
kapso-workflows/
├── kapso.yaml                  # Config del proyecto Kapso
├── .kapso/project.json         # Metadatos del proyecto
├── workflows/
│   ├── inbound-closer/
│   │   └── workflow.ts         # Conversación IA + comandos admin
│   └── typeform-sync/
│       └── workflow.ts         # Sync de leads de Typeform
└── functions/
    ├── check-is-admin/         # Verifica si el remitente es admin
    ├── route-admin-command/    # Enruta comandos admin
    ├── hubspot-lookup/         # Busca contacto en HubSpot
    ├── calendar-schedule/      # Agenda llamada en Google Calendar
    ├── score-typeform-lead/    # Evalúa leads de Typeform
    └── check-lead-qualification/ # Filtra leads por score
```

## Setup

```bash
# 1. Login en Kapso (abre browser)
kapso login

# 2. Vincular este directorio al proyecto
kapso link --project 6f17f42d-cc4b-40b5-9f77-f6e8dccb9d0b

# 3. Traer estado remoto (opcional, si hay workflows existentes)
kapso pull

# 4. Compilar workflows
kapso build

# 5. Push (dry-run primero para ver qué va a cambiar)
kapso push --dry-run
kapso push
```

## Variables de entorno requeridas

| Variable | Propósito |
|---|---|
| `ADMIN_PHONE` | Tu número WhatsApp (ej: 519XXXXXXXX) |
| `HUBSPOT_API_KEY` | Token de HubSpot |
| `DEEPSEEK_API_KEY` | API key de DeepSeek |
| `GOOGLE_CLIENT_ID` | OAuth client ID de Google |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret de Google |
| `CLOSER_EMAIL` | Email del closer default |
| `CLOSER_REFRESH_TOKEN` | Refresh token de Google Calendar del closer |
| `TYPEFORM_TOKEN` | Token de Typeform |
| `SUPABASE_URL` | URL de Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key de Supabase |

## Comandos admin (desde WhatsApp)

Una vez configurado `ADMIN_PHONE`, mandá mensajes que empiecen con `/`:

| Comando | Qué hace |
|---|---|
| `/stats` | Estado del bot |
| `/pause` | Pausar/reanudar |
| `/leads` | Últimos leads |
| `/persona` | Ver personalidad |
| `/persona_set <texto>` | Cambiar personalidad |
| `/company` | Conocimiento empresa |
| `/company_set <texto>` | Actualizar |
| `/model` | Config IA |
| `/model_set <m> [t] [tk]` | Cambiar modelo |
| `/stages` | Ver etapas |
| `/stage_set <k> <txt>` | Actualizar etapa |
| `/behavior` | Comportamiento |
| `/invite <email>` | Invitar closer Google Calendar |
| `/blacklist <num>` | Bloquear |
| `/typeform` | Estado Typeform |
| `/help` | Todos los comandos |
