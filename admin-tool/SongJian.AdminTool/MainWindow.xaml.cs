using System.ComponentModel;
using System.Windows;
using System.Windows.Input;
using SongJian.AdminTool.ViewModels;

namespace SongJian.AdminTool;

public partial class MainWindow : Window
{
    private readonly MainViewModel _viewModel = new();

    public MainWindow()
    {
        InitializeComponent();
        DataContext = _viewModel;
        _viewModel.PropertyChanged += ViewModel_PropertyChanged;
    }

    private async void Login_Click(object sender, RoutedEventArgs e) => await _viewModel.LoginAsync(LoginPassword.Password);

    private void ViewModel_PropertyChanged(object? sender, PropertyChangedEventArgs e)
    {
        if (e.PropertyName != nameof(MainViewModel.IsLoggedIn)) return;
        LoginView.Visibility = _viewModel.IsLoggedIn ? Visibility.Collapsed : Visibility.Visible;
        ShellView.Visibility = _viewModel.IsLoggedIn ? Visibility.Visible : Visibility.Collapsed;
        if (!_viewModel.IsLoggedIn) LoginPassword.Clear();
    }

    private void Players_DoubleClick(object sender, MouseButtonEventArgs e)
    {
        if (_viewModel.LoadPlayerCommand.CanExecute(null)) _viewModel.LoadPlayerCommand.Execute(null);
    }
}
