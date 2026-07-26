using System.Collections.ObjectModel;
using System.Net.Http;
using System.Text.Json;
using System.Windows;
using SongJian.AdminTool.Infrastructure;
using SongJian.AdminTool.Models;
using SongJian.AdminTool.Services;

namespace SongJian.AdminTool.ViewModels;

public sealed class MainViewModel : ObservableObject
{
    private readonly AdminApiClient _api = new();
    private readonly LocalSettings _settings = LocalSettings.Load();
    private bool _isLoggedIn;
    private bool _isBusy;
    private string _statusMessage = "未连接";
    private string _apiUrl = "";
    private string _loginUsername = "";
    private string _environmentLabel = "";
    private AdminIdentity? _admin;
    private DashboardSummary _dashboard = new();
    private PlayerRow? _selectedPlayer;
    private PlayerDetailResponse? _playerDetail;
    private string _playerSearch = "";
    private string _actionReason = "";
    private string _actionValue = "0";
    private string _mailTitle = "运营补偿";
    private string _mailBody = "感谢你的理解，请领取本次补偿。";
    private string _mailSpiritStones = "0";
    private string _mailQuantity = "1";
    private string _mailReason = "运营邮件发放";
    private CatalogEntry? _mailItem;
    private CatalogEntry? _mailEquipment;
    private CatalogEntry? _inventoryItem;
    private CatalogEntry? _inventoryEquipment;
    private CatalogEntry? _unlockTechnique;
    private CatalogEntry? _unlockRecipe;
    private CatalogEntry? _unlockEquipmentRecipe;
    private string _inventoryDelta = "1";
    private string _unlockOperation = "grant";
    private ChatRow? _selectedChat;
    private string _chatReason = "聊天内容治理";
    private AuctionRow? _selectedAuction;
    private AnnouncementRow? _selectedAnnouncement;
    private string _announcementTitle = "";
    private string _announcementBody = "";
    private string _announcementStatus = "draft";
    private string _announcementReason = "公告内容调整";
    private string _contentResource = "items";
    private JsonObjectWrapper? _selectedContent;
    private string _contentChanges = "{\n  \"description\": \"\"\n}";
    private string _contentFields = "";

    public MainViewModel()
    {
        ApiUrl = _settings.ApiUrl;
        RefreshDashboardCommand = new AsyncCommand(RefreshDashboardAsync);
        SearchPlayersCommand = new AsyncCommand(SearchPlayersAsync);
        LoadPlayerCommand = new AsyncCommand(LoadSelectedPlayerAsync, () => SelectedPlayer is not null);
        BanCommand = new AsyncCommand(() => SanctionAsync("ban"), () => SelectedPlayer is not null);
        UnbanCommand = new AsyncCommand(() => SanctionAsync("unban"), () => SelectedPlayer is not null);
        KickCommand = new AsyncCommand(() => SanctionAsync("kick"), () => SelectedPlayer is not null);
        AdjustStonesCommand = new AsyncCommand(() => AdjustResourceAsync("spiritStones", "adjust"), () => SelectedPlayer is not null);
        SetStaminaCommand = new AsyncCommand(() => AdjustResourceAsync("stamina", "set"), () => SelectedPlayer is not null);
        RestoreCommand = new AsyncCommand(RestoreAsync, () => SelectedPlayer is not null);
        SendMailCommand = new AsyncCommand(SendMailAsync, () => SelectedPlayer is not null);
        AdjustItemCommand = new AsyncCommand(() => AdjustInventoryAsync("item", InventoryItem), () => SelectedPlayer is not null && InventoryItem is not null);
        AdjustEquipmentCommand = new AsyncCommand(() => AdjustInventoryAsync("equipment", InventoryEquipment), () => SelectedPlayer is not null && InventoryEquipment is not null);
        UnlockTechniqueCommand = new AsyncCommand(() => UnlockAsync("technique", UnlockTechnique), () => SelectedPlayer is not null && UnlockTechnique is not null);
        UnlockRecipeCommand = new AsyncCommand(() => UnlockAsync("recipe", UnlockRecipe), () => SelectedPlayer is not null && UnlockRecipe is not null);
        UnlockEquipmentRecipeCommand = new AsyncCommand(() => UnlockAsync("equipmentRecipe", UnlockEquipmentRecipe), () => SelectedPlayer is not null && UnlockEquipmentRecipe is not null);
        RefreshChatsCommand = new AsyncCommand(RefreshChatsAsync);
        HideChatCommand = new AsyncCommand(() => ModerateChatAsync("hidden"), () => SelectedChat is not null);
        RestoreChatCommand = new AsyncCommand(() => ModerateChatAsync("visible"), () => SelectedChat is not null);
        RefreshAuctionsCommand = new AsyncCommand(RefreshAuctionsAsync);
        CancelAuctionCommand = new AsyncCommand(CancelAuctionAsync, () => SelectedAuction is not null);
        RefreshAnnouncementsCommand = new AsyncCommand(RefreshAnnouncementsAsync);
        SaveAnnouncementCommand = new AsyncCommand(SaveAnnouncementAsync);
        RefreshContentCommand = new AsyncCommand(RefreshContentAsync);
        SaveContentCommand = new AsyncCommand(SaveContentAsync, () => SelectedContent is not null);
        RefreshAuditCommand = new AsyncCommand(RefreshAuditAsync);
        LogoutCommand = new AsyncCommand(LogoutAsync);
    }

    public bool IsLoggedIn { get => _isLoggedIn; private set => Set(ref _isLoggedIn, value); }
    public bool IsBusy { get => _isBusy; private set => Set(ref _isBusy, value); }
    public string StatusMessage { get => _statusMessage; private set => Set(ref _statusMessage, value); }
    public string ApiUrl { get => _apiUrl; set => Set(ref _apiUrl, value); }
    public string LoginUsername { get => _loginUsername; set => Set(ref _loginUsername, value); }
    public string EnvironmentLabel { get => _environmentLabel; private set => Set(ref _environmentLabel, value); }
    public AdminIdentity? Admin { get => _admin; private set => Set(ref _admin, value); }
    public DashboardSummary Dashboard { get => _dashboard; private set => Set(ref _dashboard, value); }
    public ObservableCollection<RealmCount> RealmDistribution { get; } = [];
    public ObservableCollection<AuditRow> RecentAudits { get; } = [];
    public ObservableCollection<PlayerRow> Players { get; } = [];
    public PlayerRow? SelectedPlayer { get => _selectedPlayer; set { if (Set(ref _selectedPlayer, value)) RefreshCanExecute(); } }
    public PlayerDetailResponse? PlayerDetail { get => _playerDetail; private set { Set(ref _playerDetail, value); Raise(nameof(PlayerSummary)); } }
    public string PlayerSummary => PlayerDetail is null ? "选择玩家查看详情" : string.Join(Environment.NewLine, PlayerDetail.Player.Values.Select(x => $"{x.Key}: {x.Value}"));
    public string PlayerSearch { get => _playerSearch; set => Set(ref _playerSearch, value); }
    public string ActionReason { get => _actionReason; set => Set(ref _actionReason, value); }
    public string ActionValue { get => _actionValue; set => Set(ref _actionValue, value); }
    public string MailTitle { get => _mailTitle; set => Set(ref _mailTitle, value); }
    public string MailBody { get => _mailBody; set => Set(ref _mailBody, value); }
    public string MailSpiritStones { get => _mailSpiritStones; set => Set(ref _mailSpiritStones, value); }
    public string MailQuantity { get => _mailQuantity; set => Set(ref _mailQuantity, value); }
    public string MailReason { get => _mailReason; set => Set(ref _mailReason, value); }
    public CatalogEntry? MailItem { get => _mailItem; set { Set(ref _mailItem, value); if (value is not null) MailEquipment = null; } }
    public CatalogEntry? MailEquipment { get => _mailEquipment; set { Set(ref _mailEquipment, value); if (value is not null) MailItem = null; } }
    public ObservableCollection<CatalogEntry> CatalogItems { get; } = [];
    public ObservableCollection<CatalogEntry> CatalogEquipment { get; } = [];
    public ObservableCollection<CatalogEntry> CatalogTechniques { get; } = [];
    public CatalogEntry? InventoryItem { get => _inventoryItem; set { if (Set(ref _inventoryItem, value)) RefreshCanExecute(); } }
    public CatalogEntry? InventoryEquipment { get => _inventoryEquipment; set { if (Set(ref _inventoryEquipment, value)) RefreshCanExecute(); } }
    public CatalogEntry? UnlockTechnique { get => _unlockTechnique; set { if (Set(ref _unlockTechnique, value)) RefreshCanExecute(); } }
    public CatalogEntry? UnlockRecipe { get => _unlockRecipe; set { if (Set(ref _unlockRecipe, value)) RefreshCanExecute(); } }
    public CatalogEntry? UnlockEquipmentRecipe { get => _unlockEquipmentRecipe; set { if (Set(ref _unlockEquipmentRecipe, value)) RefreshCanExecute(); } }
    public string InventoryDelta { get => _inventoryDelta; set => Set(ref _inventoryDelta, value); }
    public string UnlockOperation { get => _unlockOperation; set => Set(ref _unlockOperation, value); }
    public ObservableCollection<string> UnlockOperations { get; } = ["grant", "remove"];
    public ObservableCollection<ChatRow> Chats { get; } = [];
    public ChatRow? SelectedChat { get => _selectedChat; set { if (Set(ref _selectedChat, value)) RefreshCanExecute(); } }
    public string ChatReason { get => _chatReason; set => Set(ref _chatReason, value); }
    public ObservableCollection<AuctionRow> Auctions { get; } = [];
    public AuctionRow? SelectedAuction { get => _selectedAuction; set { if (Set(ref _selectedAuction, value)) RefreshCanExecute(); } }
    public ObservableCollection<AnnouncementRow> Announcements { get; } = [];
    public ObservableCollection<string> AnnouncementStatuses { get; } = ["draft", "published", "withdrawn"];
    public AnnouncementRow? SelectedAnnouncement { get => _selectedAnnouncement; set { if (Set(ref _selectedAnnouncement, value) && value is not null) { AnnouncementTitle = value.Title; AnnouncementBody = value.Body; AnnouncementStatus = value.Status; } } }
    public string AnnouncementTitle { get => _announcementTitle; set => Set(ref _announcementTitle, value); }
    public string AnnouncementBody { get => _announcementBody; set => Set(ref _announcementBody, value); }
    public string AnnouncementStatus { get => _announcementStatus; set => Set(ref _announcementStatus, value); }
    public string AnnouncementReason { get => _announcementReason; set => Set(ref _announcementReason, value); }
    public ObservableCollection<string> ContentResources { get; } = ["items", "equipment", "techniques", "realms", "areas", "enemies", "events", "shop"];
    public string ContentResource { get => _contentResource; set => Set(ref _contentResource, value); }
    public ObservableCollection<JsonObjectWrapper> ContentItems { get; } = [];
    public JsonObjectWrapper? SelectedContent { get => _selectedContent; set { if (Set(ref _selectedContent, value)) { Raise(nameof(SelectedContentSummary)); RefreshCanExecute(); } } }
    public string SelectedContentSummary => SelectedContent is null ? "选择内容查看完整字段" : string.Join(Environment.NewLine, SelectedContent.Values.Select(x => $"{x.Key}: {x.Value}"));
    public string ContentChanges { get => _contentChanges; set => Set(ref _contentChanges, value); }
    public string ContentFields { get => _contentFields; private set => Set(ref _contentFields, value); }
    public ObservableCollection<AuditRow> Audits { get; } = [];

    public AsyncCommand RefreshDashboardCommand { get; }
    public AsyncCommand SearchPlayersCommand { get; }
    public AsyncCommand LoadPlayerCommand { get; }
    public AsyncCommand BanCommand { get; }
    public AsyncCommand UnbanCommand { get; }
    public AsyncCommand KickCommand { get; }
    public AsyncCommand AdjustStonesCommand { get; }
    public AsyncCommand SetStaminaCommand { get; }
    public AsyncCommand RestoreCommand { get; }
    public AsyncCommand SendMailCommand { get; }
    public AsyncCommand AdjustItemCommand { get; }
    public AsyncCommand AdjustEquipmentCommand { get; }
    public AsyncCommand UnlockTechniqueCommand { get; }
    public AsyncCommand UnlockRecipeCommand { get; }
    public AsyncCommand UnlockEquipmentRecipeCommand { get; }
    public AsyncCommand RefreshChatsCommand { get; }
    public AsyncCommand HideChatCommand { get; }
    public AsyncCommand RestoreChatCommand { get; }
    public AsyncCommand RefreshAuctionsCommand { get; }
    public AsyncCommand CancelAuctionCommand { get; }
    public AsyncCommand RefreshAnnouncementsCommand { get; }
    public AsyncCommand SaveAnnouncementCommand { get; }
    public AsyncCommand RefreshContentCommand { get; }
    public AsyncCommand SaveContentCommand { get; }
    public AsyncCommand RefreshAuditCommand { get; }
    public AsyncCommand LogoutCommand { get; }

    public async Task LoginAsync(string password)
    {
        await RunAsync(async () =>
        {
            _api.Configure(ApiUrl);
            var handshake = await _api.HandshakeAsync();
            if (handshake.ApiVersion != "1.0") throw new InvalidOperationException($"不兼容管理 API 版本：{handshake.ApiVersion}");
            var login = await _api.LoginAsync(LoginUsername, password);
            _api.SetToken(login.Token);
            Admin = login.Admin;
            EnvironmentLabel = $"{handshake.Environment} · {handshake.InstanceId} · API {handshake.ApiVersion}";
            _settings.ApiUrl = ApiUrl;
            _settings.Save();
            IsLoggedIn = true;
            var dashboard = await _api.GetAsync<DashboardResponse>("/api/admin/dashboard");
            Dashboard = dashboard.Summary;
            Replace(RealmDistribution, dashboard.RealmDistribution);
            Replace(RecentAudits, dashboard.RecentAudits);
            var players = await _api.GetAsync<PageResponse<PlayerRow>>("/api/admin/players?page=1&pageSize=100");
            Replace(Players, players.Items);
            await LoadCatalogsAsync();
        }, "登录成功");
    }

    private async Task LogoutAsync()
    {
        _api.SetToken(null); Admin = null; IsLoggedIn = false; StatusMessage = "已退出"; await Task.CompletedTask;
    }

    private async Task RefreshDashboardAsync() => await RunAsync(async () =>
    {
        var response = await _api.GetAsync<DashboardResponse>("/api/admin/dashboard");
        Dashboard = response.Summary;
        Replace(RealmDistribution, response.RealmDistribution);
        Replace(RecentAudits, response.RecentAudits);
    }, "总览已刷新");

    private async Task SearchPlayersAsync() => await RunAsync(async () =>
    {
        var q = Uri.EscapeDataString(PlayerSearch);
        var response = await _api.GetAsync<PageResponse<PlayerRow>>($"/api/admin/players?page=1&pageSize=100&search={q}");
        Replace(Players, response.Items);
    }, $"玩家列表已刷新");

    private async Task LoadSelectedPlayerAsync()
    {
        if (SelectedPlayer is null) return;
        await RunAsync(async () => PlayerDetail = await _api.GetAsync<PlayerDetailResponse>($"/api/admin/players/{SelectedPlayer.UserId}"), "玩家详情已刷新");
    }

    private async Task SanctionAsync(string action)
    {
        if (SelectedPlayer is null || !Confirm(action == "ban" ? "封禁玩家" : action == "unban" ? "解封玩家" : "踢下线")) return;
        await WriteAndReloadAsync($"/api/admin/players/{SelectedPlayer.UserId}/sanction", new { action, reason = ActionReason });
    }

    private async Task AdjustResourceAsync(string resource, string mode)
    {
        if (SelectedPlayer is null || !long.TryParse(ActionValue, out var value) || !Confirm(resource == "stamina" ? "设置精力" : "调整灵石")) return;
        await WriteAndReloadAsync($"/api/admin/players/{SelectedPlayer.UserId}/resources", new { resource, mode, value, reason = ActionReason, expectedVersion = long.Parse(SelectedPlayer.AdminVersion) });
    }

    private async Task RestoreAsync()
    {
        if (SelectedPlayer is null || !Confirm("修复角色状态")) return;
        await WriteAndReloadAsync($"/api/admin/players/{SelectedPlayer.UserId}/restore", new { reason = ActionReason, options = new { fullHeal = true, clearBuff = true, endRetreat = true, clearPending = true, clampStamina = true, unequipInvalid = true } });
    }

    private async Task SendMailAsync()
    {
        if (SelectedPlayer is null || !long.TryParse(MailSpiritStones, out var stones) || !int.TryParse(MailQuantity, out var quantity) || !Confirm("发送附件邮件", MailReason, $"{SelectedPlayer.Username} / {SelectedPlayer.CharacterName}")) return;
        await WriteAndReloadAsync($"/api/admin/players/{SelectedPlayer.UserId}/mail", new { title = MailTitle, body = MailBody, itemId = MailItem?.Id, equipmentId = MailEquipment?.Id, quantity, spiritStones = stones, expiresDays = 30, reason = MailReason });
    }

    private async Task AdjustInventoryAsync(string kind, CatalogEntry? asset)
    {
        if (SelectedPlayer is null || asset is null || !int.TryParse(InventoryDelta, out var delta) || delta == 0 || !Confirm(kind == "item" ? "纠正物品库存" : "纠正装备库存")) return;
        await WriteAndReloadAsync($"/api/admin/players/{SelectedPlayer.UserId}/inventory", new { kind, assetId = asset.Id, delta, reason = ActionReason });
    }

    private async Task UnlockAsync(string kind, CatalogEntry? asset)
    {
        if (SelectedPlayer is null || asset is null || !Confirm(UnlockOperation == "grant" ? "解锁内容" : "移除解锁")) return;
        await WriteAndReloadAsync($"/api/admin/players/{SelectedPlayer.UserId}/unlocks", new { kind, assetId = asset.Id, operation = UnlockOperation, reason = ActionReason });
    }

    private async Task RefreshChatsAsync() => await RunAsync(async () => Replace(Chats, (await _api.GetAsync<PageResponse<ChatRow>>("/api/admin/chats?page=1&pageSize=100")).Items), "聊天已刷新");
    private async Task ModerateChatAsync(string status)
    {
        if (SelectedChat is null || !Confirm(status == "hidden" ? "隐藏消息" : "恢复消息", ChatReason, $"聊天 #{SelectedChat.Id}")) return;
        await RunAsync(async () => { await _api.WriteAsync<JsonElement>(HttpMethod.Patch, $"/api/admin/chats/{SelectedChat.Id}", new { status, reason = ChatReason }); Replace(Chats, (await _api.GetAsync<PageResponse<ChatRow>>("/api/admin/chats?page=1&pageSize=100")).Items); }, status == "hidden" ? "消息已隐藏，玩家端不再显示" : "消息已恢复，玩家端重新显示");
    }

    private async Task RefreshAuctionsAsync() => await RunAsync(async () => Replace(Auctions, (await _api.GetAsync<PageResponse<AuctionRow>>("/api/admin/auctions?page=1&pageSize=100")).Items), "拍卖已刷新");
    private async Task CancelAuctionAsync()
    {
        if (SelectedAuction is null || !Confirm("管理员撤拍并返还")) return;
        await RunAsync(async () => { await _api.WriteAsync<JsonElement>(HttpMethod.Post, $"/api/admin/auctions/{SelectedAuction.Id}/cancel", new { reason = ActionReason }); Replace(Auctions, (await _api.GetAsync<PageResponse<AuctionRow>>("/api/admin/auctions?page=1&pageSize=100")).Items); }, "拍品已撤销");
    }

    private async Task RefreshAnnouncementsAsync() => await RunAsync(async () => Replace(Announcements, (await _api.GetAsync<PageResponse<AnnouncementRow>>("/api/admin/announcements?page=1&pageSize=100")).Items), "公告已刷新");
    private async Task SaveAnnouncementAsync()
    {
        var target = SelectedAnnouncement is null ? "新公告" : $"公告 #{SelectedAnnouncement.Id}";
        if (!Confirm(SelectedAnnouncement is null ? "创建公告" : "更新公告", AnnouncementReason, target)) return;
        await RunAsync(async () =>
        {
            var body = new { title = AnnouncementTitle, body = AnnouncementBody, priority = 0, pinned = false, status = AnnouncementStatus, reason = AnnouncementReason };
            if (SelectedAnnouncement is null) await _api.WriteAsync<JsonElement>(HttpMethod.Post, "/api/admin/announcements", body);
            else await _api.WriteAsync<JsonElement>(HttpMethod.Put, $"/api/admin/announcements/{SelectedAnnouncement.Id}", body);
            SelectedAnnouncement = null; AnnouncementTitle = ""; AnnouncementBody = ""; Replace(Announcements, (await _api.GetAsync<PageResponse<AnnouncementRow>>("/api/admin/announcements?page=1&pageSize=100")).Items);
        }, "公告已保存");
    }

    private async Task RefreshContentAsync() => await RunAsync(async () =>
    {
        var response = await _api.GetAsync<ContentResponse>($"/api/admin/content/{ContentResource}?page=1&pageSize=100");
        Replace(ContentItems, response.Items); ContentFields = "可编辑字段：" + string.Join("、", response.EditableFields);
    }, "内容目录已刷新");

    private async Task SaveContentAsync()
    {
        if (SelectedContent is null || !SelectedContent.Values.TryGetValue("id", out var idValue) || !Confirm("修改线上内容")) return;
        Dictionary<string, object?>? changes;
        try { changes = JsonSerializer.Deserialize<Dictionary<string, object?>>(ContentChanges); }
        catch (JsonException error) { ShowError("JSON 格式错误：" + error.Message); return; }
        await RunAsync(async () => { await _api.WriteAsync<JsonElement>(HttpMethod.Patch, $"/api/admin/content/{ContentResource}/{idValue}", new { changes, reason = ActionReason }); var response = await _api.GetAsync<ContentResponse>($"/api/admin/content/{ContentResource}?page=1&pageSize=100"); Replace(ContentItems, response.Items); }, "内容已更新");
    }

    private async Task RefreshAuditAsync() => await RunAsync(async () => Replace(Audits, (await _api.GetAsync<PageResponse<AuditRow>>("/api/admin/audit?page=1&pageSize=100")).Items), "审计已刷新");

    private async Task LoadCatalogsAsync()
    {
        var response = await _api.GetAsync<CatalogsResponse>("/api/admin/catalogs");
        Replace(CatalogItems, response.Items); Replace(CatalogEquipment, response.Equipment); Replace(CatalogTechniques, response.Techniques);
    }

    private async Task WriteAndReloadAsync(string path, object body) => await RunAsync(async () =>
    {
        await _api.WriteAsync<JsonElement>(HttpMethod.Post, path, body);
        var q = Uri.EscapeDataString(PlayerSearch);
        Replace(Players, (await _api.GetAsync<PageResponse<PlayerRow>>($"/api/admin/players?page=1&pageSize=100&search={q}")).Items);
        if (SelectedPlayer is not null) PlayerDetail = await _api.GetAsync<PlayerDetailResponse>($"/api/admin/players/{SelectedPlayer.UserId}");
    }, "操作完成");

    private bool Confirm(string action) => Confirm(action, ActionReason);

    private bool Confirm(string action, string reason, string? targetOverride = null)
    {
        if (string.IsNullOrWhiteSpace(reason) || reason.Trim().Length < 4) { ShowError("请填写至少 4 个字符的操作原因"); return false; }
        var target = targetOverride ?? (SelectedPlayer is not null ? $"{SelectedPlayer.Username} / {SelectedPlayer.CharacterName}"
            : SelectedChat is not null ? $"聊天 #{SelectedChat.Id}"
            : SelectedAuction is not null ? $"拍品 #{SelectedAuction.Id}"
            : SelectedAnnouncement is not null ? $"公告 #{SelectedAnnouncement.Id}"
            : SelectedContent is not null ? $"内容 {SelectedContent.Summary}" : "当前目标");
        return MessageBox.Show($"确认{action}？\n目标：{target}\n原因：{reason.Trim()}", "高风险操作确认", MessageBoxButton.YesNo, MessageBoxImage.Warning) == MessageBoxResult.Yes;
    }

    private async Task RunAsync(Func<Task> action, string success)
    {
        if (IsBusy) return;
        IsBusy = true; StatusMessage = "处理中...";
        try { await action(); StatusMessage = success; }
        catch (ApiException error) { ShowError($"{error.Message}\nRequest ID：{error.RequestId ?? "无"}"); }
        catch (Exception error) { ShowError(error.Message); }
        finally { IsBusy = false; }
    }

    private void ShowError(string message) { StatusMessage = message.Split('\n')[0]; MessageBox.Show(message, "操作失败", MessageBoxButton.OK, MessageBoxImage.Error); }
    private void RefreshCanExecute() { foreach (var command in new[] { LoadPlayerCommand, BanCommand, UnbanCommand, KickCommand, AdjustStonesCommand, SetStaminaCommand, RestoreCommand, SendMailCommand, AdjustItemCommand, AdjustEquipmentCommand, UnlockTechniqueCommand, UnlockRecipeCommand, UnlockEquipmentRecipeCommand, HideChatCommand, RestoreChatCommand, CancelAuctionCommand, SaveContentCommand }) command.Refresh(); }
    private static void Replace<T>(ObservableCollection<T> collection, IEnumerable<T> values) { collection.Clear(); foreach (var value in values) collection.Add(value); }
}
