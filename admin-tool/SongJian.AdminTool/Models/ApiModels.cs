using System.Text.Json;
using System.Text.Json.Serialization;

namespace SongJian.AdminTool.Models;

public sealed class Handshake
{
    public string Product { get; set; } = "";
    public string Environment { get; set; } = "";
    public string InstanceId { get; set; } = "";
    public string ApiVersion { get; set; } = "";
    public DateTime ServerTime { get; set; }
}

public sealed class AdminIdentity
{
    public int Id { get; set; }
    public string Username { get; set; } = "";
    public string DisplayName { get; set; } = "";
    public string Role { get; set; } = "";
}

public sealed class LoginResponse
{
    public string Token { get; set; } = "";
    public AdminIdentity Admin { get; set; } = new();
}

public sealed class DashboardResponse
{
    public DashboardSummary Summary { get; set; } = new();
    public List<RealmCount> RealmDistribution { get; set; } = [];
    public List<AuditRow> RecentAudits { get; set; } = [];
}

public sealed class DashboardSummary
{
    public int Players { get; set; }
    [JsonPropertyName("new_today")] public int NewToday { get; set; }
    [JsonPropertyName("active_today")] public int ActiveToday { get; set; }
    [JsonPropertyName("active_seven_days")] public int ActiveSevenDays { get; set; }
    public int Banned { get; set; }
    [JsonPropertyName("spirit_stones")] public string SpiritStones { get; set; } = "0";
    [JsonPropertyName("active_auctions")] public int ActiveAuctions { get; set; }
    [JsonPropertyName("unclaimed_mail")] public int UnclaimedMail { get; set; }
    [JsonPropertyName("battles_24h")] public int Battles24h { get; set; }
}

public sealed class RealmCount { public string Name { get; set; } = ""; public int Count { get; set; } }

public sealed class PageResponse<T>
{
    public List<T> Items { get; set; } = [];
    public int Total { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public sealed class PlayerRow
{
    [JsonPropertyName("user_id")] public int UserId { get; set; }
    public string Username { get; set; } = "";
    public string Status { get; set; } = "";
    [JsonPropertyName("character_id")] public int? CharacterId { get; set; }
    [JsonPropertyName("character_name")] public string CharacterName { get; set; } = "";
    [JsonPropertyName("major_realm")] public string MajorRealm { get; set; } = "";
    [JsonPropertyName("sub_stage")] public string SubStage { get; set; } = "";
    [JsonPropertyName("current_qi")] public string CurrentQi { get; set; } = "0";
    [JsonPropertyName("spirit_stones")] public string SpiritStones { get; set; } = "0";
    public int Stamina { get; set; }
    [JsonPropertyName("last_online_at")] public DateTime? LastOnlineAt { get; set; }
    [JsonPropertyName("admin_version")] public string AdminVersion { get; set; } = "0";
    public string RealmDisplay => $"{MajorRealm}{SubStage}";
}

public sealed class PlayerDetailResponse
{
    public JsonObjectWrapper Player { get; set; } = new();
    public List<JsonObjectWrapper> Inventory { get; set; } = [];
    public List<JsonObjectWrapper> Equipment { get; set; } = [];
    public List<JsonObjectWrapper> Techniques { get; set; } = [];
    public List<JsonObjectWrapper> Recipes { get; set; } = [];
    public List<JsonObjectWrapper> EquipmentRecipes { get; set; } = [];
    public List<JsonObjectWrapper> Mail { get; set; } = [];
    public List<JsonObjectWrapper> Auctions { get; set; } = [];
    public List<JsonObjectWrapper> Battles { get; set; } = [];
    public List<JsonObjectWrapper> Explorations { get; set; } = [];
    public List<JsonObjectWrapper> Ascensions { get; set; } = [];
    public List<AuditRow> Audits { get; set; } = [];
    public List<JsonObjectWrapper> Ledger { get; set; } = [];
    public List<HealthIssue> Health { get; set; } = [];
}

[JsonConverter(typeof(JsonObjectWrapperConverter))]
public sealed class JsonObjectWrapper
{
    public Dictionary<string, JsonElement> Values { get; init; } = new(StringComparer.OrdinalIgnoreCase);
    public string this[string key] => Values.TryGetValue(key, out var value) ? value.ToString() : "";
    public string Summary => string.Join("  ·  ", Values.Take(6).Select(pair => $"{pair.Key}: {pair.Value}"));
}

public sealed class JsonObjectWrapperConverter : JsonConverter<JsonObjectWrapper>
{
    public override JsonObjectWrapper Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
    {
        using var document = JsonDocument.ParseValue(ref reader);
        var values = document.RootElement.EnumerateObject().ToDictionary(p => p.Name, p => p.Value.Clone(), StringComparer.OrdinalIgnoreCase);
        return new JsonObjectWrapper { Values = values };
    }
    public override void Write(Utf8JsonWriter writer, JsonObjectWrapper value, JsonSerializerOptions options) => JsonSerializer.Serialize(writer, value.Values, options);
}

public sealed class HealthIssue { public string Code { get; set; } = ""; public string Severity { get; set; } = ""; public string Message { get; set; } = ""; public bool Repairable { get; set; } }

public sealed class ChatRow
{
    public long Id { get; set; }
    public string Channel { get; set; } = "";
    public string Body { get; set; } = "";
    public string Sender { get; set; } = "";
    public string? Recipient { get; set; }
    [JsonPropertyName("moderation_status")] public string ModerationStatus { get; set; } = "";
    [JsonPropertyName("moderation_reason")] public string? ModerationReason { get; set; }
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
}

public sealed class AuctionRow
{
    public long Id { get; set; }
    public string Status { get; set; } = "";
    [JsonPropertyName("seller_username")] public string SellerUsername { get; set; } = "";
    [JsonPropertyName("seller_name")] public string SellerName { get; set; } = "";
    [JsonPropertyName("item_name")] public string? ItemName { get; set; }
    [JsonPropertyName("equipment_name")] public string? EquipmentName { get; set; }
    public int Quantity { get; set; }
    [JsonPropertyName("unit_price")] public string UnitPrice { get; set; } = "0";
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    public string AssetName => ItemName ?? EquipmentName ?? "未知资产";
}

public sealed class AnnouncementRow
{
    public long Id { get; set; }
    public string Title { get; set; } = "";
    public string Body { get; set; } = "";
    public int Priority { get; set; }
    public bool Pinned { get; set; }
    public string Status { get; set; } = "";
    [JsonPropertyName("starts_at")] public DateTime? StartsAt { get; set; }
    [JsonPropertyName("ends_at")] public DateTime? EndsAt { get; set; }
    [JsonPropertyName("updated_at")] public DateTime UpdatedAt { get; set; }
}

public sealed class AuditRow
{
    public long Id { get; set; }
    [JsonPropertyName("admin_username")] public string AdminUsername { get; set; } = "";
    public string Action { get; set; } = "";
    [JsonPropertyName("target_type")] public string TargetType { get; set; } = "";
    [JsonPropertyName("target_id")] public string? TargetId { get; set; }
    public string? Reason { get; set; }
    public bool Success { get; set; }
    [JsonPropertyName("created_at")] public DateTime CreatedAt { get; set; }
    [JsonPropertyName("request_id")] public Guid RequestId { get; set; }
}

public sealed class ContentResponse
{
    public string Resource { get; set; } = "";
    public List<JsonObjectWrapper> Items { get; set; } = [];
    public int Total { get; set; }
    public List<string> EditableFields { get; set; } = [];
}

public sealed class CatalogsResponse
{
    public List<CatalogEntry> Items { get; set; } = [];
    public List<CatalogEntry> Equipment { get; set; } = [];
    public List<CatalogEntry> Techniques { get; set; } = [];
}

public sealed class CatalogEntry
{
    public int Id { get; set; }
    public string Code { get; set; } = "";
    public string Name { get; set; } = "";
    public string Rarity { get; set; } = "";
    public string Display => $"{Name} · {Rarity} · #{Id}";
}
