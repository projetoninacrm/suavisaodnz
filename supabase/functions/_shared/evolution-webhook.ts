const REQUIRED_WEBHOOK_EVENTS = ["MESSAGES_UPSERT"];

interface EnsureEvolutionWebhookParams {
  evolutionApiUrl: string;
  evolutionApiKey: string;
  instance: string;
  webhookUrl: string;
}

interface WebhookAttempt {
  endpoint: string;
  status: number;
  body: string;
}

export async function ensureEvolutionWebhookConfigured({
  evolutionApiUrl,
  evolutionApiKey,
  instance,
  webhookUrl,
}: EnsureEvolutionWebhookParams): Promise<void> {
  const baseUrl = evolutionApiUrl.replace(/\/+$/, "");
  const encodedInstance = encodeURIComponent(instance);

  const endpointCandidates = [
    `${baseUrl}/webhook/set/${encodedInstance}`,
    `${baseUrl}/webhook/instance/${encodedInstance}`,
  ];

  const bodyCandidates = [
    {
      enabled: true,
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: REQUIRED_WEBHOOK_EVENTS,
    },
    {
      webhook: {
        enabled: true,
        url: webhookUrl,
        byEvents: false,
        base64: false,
        events: REQUIRED_WEBHOOK_EVENTS,
      },
    },
    {
      webhook: {
        enabled: true,
        url: webhookUrl,
        events: REQUIRED_WEBHOOK_EVENTS,
      },
      events: REQUIRED_WEBHOOK_EVENTS,
    },
    {
      instanceName: instance,
      enabled: true,
      webhook: {
        enabled: true,
        url: webhookUrl,
        events: REQUIRED_WEBHOOK_EVENTS,
      },
      events: REQUIRED_WEBHOOK_EVENTS,
    },
  ];

  const headerCandidates = [
    { "Content-Type": "application/json", apikey: evolutionApiKey },
    { "Content-Type": "application/json", ApiKey: evolutionApiKey },
    { "Content-Type": "application/json", Authorization: `Bearer ${evolutionApiKey}` },
  ];

  const failures: WebhookAttempt[] = [];

  for (const endpoint of endpointCandidates) {
    for (const headers of headerCandidates) {
      for (const body of bodyCandidates) {
        try {
          const response = await fetch(endpoint, {
            method: "POST",
            headers,
            body: JSON.stringify(body),
          });

          if (response.ok) {
            return;
          }

          const responseBody = await response.text();
          failures.push({
            endpoint,
            status: response.status,
            body: responseBody.substring(0, 180),
          });

          if (response.status !== 401 && response.status !== 403 && response.status !== 404) {
            throw new Error(`Webhook configure failed (${response.status}): ${responseBody.substring(0, 180)}`);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : "Erro desconhecido";
          failures.push({ endpoint, status: 0, body: message.substring(0, 180) });
        }
      }
    }
  }

  const lastFailure = failures[failures.length - 1];
  if (!lastFailure) {
    throw new Error("Falha ao configurar webhook da Evolution");
  }

  throw new Error(
    `Falha ao configurar webhook da Evolution. Última tentativa: ${lastFailure.endpoint} [${lastFailure.status}] ${lastFailure.body}`,
  );
}
