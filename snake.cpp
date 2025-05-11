#include <windows.h>
#include <vector>
#include <ctime>
#include <string>

#define ID_TIMER 1
const int CELL_SIZE = 20;
const int WIDTH = 20;
const int HEIGHT = 20;

enum Direction { UP, DOWN, LEFT, RIGHT };
struct Point { int x, y; };

std::vector<Point> snake = { {WIDTH / 2, HEIGHT / 2} };
Point food = { rand() % WIDTH, rand() % HEIGHT };
Direction dir = RIGHT;
bool gameOver = false;
int score = 0;

LRESULT CALLBACK WndProc(HWND, UINT, WPARAM, LPARAM);

void DrawGame(HDC hdc) {
    // Clear screen
    Rectangle(hdc, 0, 0, CELL_SIZE * WIDTH, CELL_SIZE * HEIGHT);

    // Draw snake
    for (auto& p : snake) {
        Rectangle(hdc,
            p.x * CELL_SIZE,
            p.y * CELL_SIZE,
            (p.x + 1) * CELL_SIZE,
            (p.y + 1) * CELL_SIZE);
    }

    // Draw food
    Ellipse(hdc,
        food.x * CELL_SIZE,
        food.y * CELL_SIZE,
        (food.x + 1) * CELL_SIZE,
        (food.y + 1) * CELL_SIZE);
    
    // Draw score
    SetTextColor(hdc, RGB(255, 255, 255));
    SetBkMode(hdc, TRANSPARENT);
    std::wstring scoreText = L"Score: " + std::to_wstring(score);
    TextOut(hdc, 10, HEIGHT * CELL_SIZE + 5, scoreText.c_str(), scoreText.length());

    // Game over
    if (gameOver) {
        std::wstring msg = L"GAME OVER!";
        TextOut(hdc, CELL_SIZE * 5, CELL_SIZE * HEIGHT / 2, msg.c_str(), msg.length());
    }
}

void MoveSnake() {
    if (gameOver) return;

    Point head = snake[0];
    switch (dir) {
        case UP:    head.y--; break;
        case DOWN:  head.y++; break;
        case LEFT:  head.x--; break;
        case RIGHT: head.x++; break;
    }

    // Check collision
    if (head.x < 0 || head.y < 0 || head.x >= WIDTH || head.y >= HEIGHT) {
        gameOver = true;
        return;
    }

    for (auto& p : snake) {
        if (p.x == head.x && p.y == head.y) {
            gameOver = true;
            return;
        }
    }

    // Move snake
    snake.insert(snake.begin(), head);
    
    if (head.x == food.x && head.y == food.y) {
        score += 10;
        food = { rand() % WIDTH, rand() % HEIGHT };
    } else {
        snake.pop_back();
    }
}

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE, LPSTR, int nCmdShow) {
    const wchar_t CLASS_NAME[] = L"SnakeWindow";

    WNDCLASS wc = {};
    wc.lpfnWndProc = WndProc;
    wc.hInstance = hInstance;
    wc.lpszClassName = CLASS_NAME;
    wc.hbrBackground = (HBRUSH)(COLOR_WINDOW + 1);

    RegisterClass(&wc);

    HWND hwnd = CreateWindowEx(
        0,
        CLASS_NAME,
        L"Snake Game - Win32 API",
        WS_OVERLAPPEDWINDOW,
        CW_USEDEFAULT, CW_USEDEFAULT,
        CELL_SIZE * WIDTH + 20, CELL_SIZE * HEIGHT + 80,
        NULL, NULL, hInstance, NULL);

    if (!hwnd) return 0;

    ShowWindow(hwnd, nCmdShow);
    UpdateWindow(hwnd);
    SetTimer(hwnd, ID_TIMER, 150, NULL); // Game loop

    MSG msg = {};
    while (GetMessage(&msg, NULL, 0, 0)) {
        TranslateMessage(&msg);
        DispatchMessage(&msg);
    }

    return 0;
}

LRESULT CALLBACK WndProc(HWND hwnd, UINT msg, WPARAM wParam, LPARAM lParam) {
    switch (msg) {
        case WM_PAINT: {
            PAINTSTRUCT ps;
            HDC hdc = BeginPaint(hwnd, &ps);
            DrawGame(hdc);
            EndPaint(hwnd, &ps);
            break;
        }
        case WM_KEYDOWN:
            switch (wParam) {
                case VK_UP: if (dir != DOWN) dir = UP; break;
                case VK_DOWN: if (dir != UP) dir = DOWN; break;
                case VK_LEFT: if (dir != RIGHT) dir = LEFT; break;
                case VK_RIGHT: if (dir != LEFT) dir = RIGHT; break;
            }
            break;
        case WM_TIMER:
            MoveSnake();
            InvalidateRect(hwnd, NULL, TRUE);
            break;
        case WM_DESTROY:
            KillTimer(hwnd, ID_TIMER);
            PostQuitMessage(0);
            break;
    }
    return DefWindowProc(hwnd, msg, wParam, lParam);
}
