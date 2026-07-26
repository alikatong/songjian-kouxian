using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using SongJian.AdminTool.Models;

namespace SongJian.AdminTool.Services;

public sealed class ApiException(HttpStatusCode statusCode, string message, string? requestId = null) : Exception(message)
{
    public HttpStatusCode StatusCode { get; } = statusCode;
    public string? RequestId { get; } = requestId;
}

public sealed class AdminApiClient
{
    private readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(20) };
    private readonly JsonSerializerOptions _json = new(JsonSerializerDefaults.Web)
    {
        PropertyNameCaseInsensitive = true,
        NumberHandling = System.Text.Json.Serialization.JsonNumberHandling.AllowReadingFromString,
    };

    public string BaseUrl { get; private set; } = "http://127.0.0.1:3001";

    public void Configure(string baseUrl)
    {
        BaseUrl = baseUrl.Trim().TrimEnd('/');
        if (!Uri.TryCreate(BaseUrl, UriKind.Absolute, out var uri) || uri.Scheme is not ("http" or "https"))
            throw new ArgumentException("API 地址必须是有效 HTTP/HTTPS 地址");
    }

    public void SetToken(string? token) => _http.DefaultRequestHeaders.Authorization =
        string.IsNullOrWhiteSpace(token) ? null : new AuthenticationHeaderValue("Bearer", token);

    public Task<Handshake> HandshakeAsync() => GetAsync<Handshake>("/api/admin/handshake");

    public Task<LoginResponse> LoginAsync(string username, string password) =>
        SendAsync<LoginResponse>(HttpMethod.Post, "/api/admin/auth/login", new { username, password }, false);

    public Task<T> GetAsync<T>(string path) => SendAsync<T>(HttpMethod.Get, path, null, false);

    public Task<T> WriteAsync<T>(HttpMethod method, string path, object body) =>
        SendAsync<T>(method, path, body, true);

    private async Task<T> SendAsync<T>(HttpMethod method, string path, object? body, bool idempotent)
    {
        using var request = new HttpRequestMessage(method, BaseUrl + path);
        if (body is not null) request.Content = JsonContent.Create(body, options: _json);
        if (idempotent) request.Headers.Add("Idempotency-Key", Guid.NewGuid().ToString());
        using var response = await _http.SendAsync(request);
        var text = await response.Content.ReadAsStringAsync();
        if (!response.IsSuccessStatusCode)
        {
            string message = $"请求失败：{(int)response.StatusCode}";
            string? requestId = response.Headers.TryGetValues("X-Request-Id", out var values) ? values.FirstOrDefault() : null;
            try
            {
                var node = JsonNode.Parse(text);
                message = node?["error"]?.GetValue<string>() ?? message;
                requestId ??= node?["requestId"]?.GetValue<string>();
            }
            catch (JsonException) { }
            throw new ApiException(response.StatusCode, message, requestId);
        }
        return JsonSerializer.Deserialize<T>(text, _json) ?? throw new ApiException(response.StatusCode, "服务端返回空数据");
    }
}
