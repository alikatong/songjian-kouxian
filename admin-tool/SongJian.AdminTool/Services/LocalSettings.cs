using System.Text.Json;
using System.IO;

namespace SongJian.AdminTool.Services;

public sealed class LocalSettings
{
    private static readonly string DirectoryPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "SongJianAdmin");
    private static readonly string FilePath = Path.Combine(DirectoryPath, "settings.json");
    public string ApiUrl { get; set; } = "http://127.0.0.1:3001";

    public static LocalSettings Load()
    {
        try { return JsonSerializer.Deserialize<LocalSettings>(File.ReadAllText(FilePath)) ?? new(); }
        catch { return new(); }
    }

    public void Save()
    {
        Directory.CreateDirectory(DirectoryPath);
        File.WriteAllText(FilePath, JsonSerializer.Serialize(this, new JsonSerializerOptions { WriteIndented = true }));
    }
}
