import { All, Controller, Get, Headers, Param, Req, Res } from "@nestjs/common";
import { OpenClawOpenChatCutGatewayService } from "./openclaw-openchatcut-gateway.service";

type HeadersMap = Record<string, string | string[] | undefined>;

type ProxyRequest = {
  method?: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  originalUrl?: string;
};

type ProxyResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): ProxyResponse;
  end(body?: unknown): unknown;
};

@Controller("openclaw/openchatcut-gateway")
export class OpenClawOpenChatCutGatewayController {
  constructor(
    private readonly openClawOpenChatCutGatewayService: OpenClawOpenChatCutGatewayService,
  ) {}

  @Get("v1/models")
  async listModels(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/models");
  }

  @All("v1/chat/completions")
  async chatCompletions(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/chat/completions");
  }

  @All("v1/responses")
  async responses(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/responses");
  }

  @All("v1/messages")
  async messages(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/messages");
  }

  @All("v1/images/generations")
  async imageGenerations(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/images/generations");
  }

  @All("v1/audio/speech")
  async audioSpeech(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/audio/speech");
  }

  @All("v1/audio/transcriptions")
  async audioTranscriptions(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/audio/transcriptions");
  }

  @All("v1/audio/translations")
  async audioTranslations(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/audio/translations");
  }

  @All("v1/videos")
  async createVideo(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/v1/videos");
  }

  @Get("v1/videos/:taskId")
  async getVideoTask(
    @Headers() headers: HeadersMap,
    @Param("taskId") taskId: string,
    @Req() request: ProxyRequest,
    @Res() response: ProxyResponse,
  ) {
    return this.forward(headers, request, response, `/v1/videos/${encodeURIComponent(taskId)}`);
  }

  @All("suno/submit/:action")
  async submitMusicTask(
    @Headers() headers: HeadersMap,
    @Param("action") action: string,
    @Req() request: ProxyRequest,
    @Res() response: ProxyResponse,
  ) {
    return this.forward(headers, request, response, `/suno/submit/${encodeURIComponent(action)}`);
  }

  @Get("suno/fetch")
  async batchFetchMusicTasks(@Headers() headers: HeadersMap, @Req() request: ProxyRequest, @Res() response: ProxyResponse) {
    return this.forward(headers, request, response, "/suno/fetch");
  }

  @Get("suno/fetch/:taskId")
  async fetchMusicTask(
    @Headers() headers: HeadersMap,
    @Param("taskId") taskId: string,
    @Req() request: ProxyRequest,
    @Res() response: ProxyResponse,
  ) {
    return this.forward(headers, request, response, `/suno/fetch/${encodeURIComponent(taskId)}`);
  }

  private async forward(headers: HeadersMap, request: ProxyRequest, response: ProxyResponse, upstreamPath: string) {
    const result = await this.openClawOpenChatCutGatewayService.proxyRequest(headers, {
      method: request.method,
      headers: request.headers,
      body: request.body,
      originalUrl: request.originalUrl,
      raw: request,
    }, upstreamPath);

    Object.entries(result.headers).forEach(([name, value]) => {
      response.setHeader(name, value);
    });
    response.status(result.status);
    if (!result.body) {
      response.end();
      return;
    }
    result.body.pipe(response as unknown as NodeJS.WritableStream);
  }
}
