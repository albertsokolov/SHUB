#!/bin/bash

# Останавливаем выполнение скрипта при любой ошибке
set -e

APP_NAME="SHUB"

echo "===================================================="
echo " Подготовка к отправке проекта [$APP_NAME] на GitHub"
echo "===================================================="

# 1. Автоматический запуск SSH-агента и добавление ключа
if [ -z "$SSH_AUTH_SOCK" ]; then
    echo "🔑 Запуск SSH-агента..."
    eval "$(ssh-agent -s)" > /dev/null
fi

if ! ssh-add -l &> /dev/null; then
    echo "🔑 Добавление SSH-ключа..."
    if [ -f "$HOME/.ssh/id_ed25519" ]; then
        ssh-add "$HOME/.ssh/id_ed25519"
    else
        echo "❌ Ошибка: Файл ключа $HOME/.ssh/id_ed25519 не найден!"
        exit 1
    fi
fi

# 2. Проверяем доступ к GitHub (исправленный вариант)
echo " Проверка SSH-подключения к GitHub..."
# Перенаправляем вывод в переменную, игнорируя код возврата ssh через '|| true'
SSH_CHECK=$(ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -T git@github.com 2>&1 || true)

if [[ "$SSH_CHECK" != *"successfully authenticated"* ]]; then
    echo "❌ Ошибка аутентификации. Ответ сервера:"
    echo "$SSH_CHECK"
    echo "----------------------------------------------------"
    echo "Убедитесь, что ваш публичный ключ добавлен в настройки GitHub."
    exit 1
fi

# 3. Показываем текущий статус файлов перед отправкой
echo " Текущий статус локального репозитория:"
git status -s
echo "----------------------------------------------------"

# 4. Запрашиваем текст коммита у пользователя
echo " Введите сообщение для коммита (что изменилось?):"
read -r commit_message

# Если пользователь ничего не ввел, задаем дефолтное сообщение
if [ -z "$commit_message" ]; then
    commit_message="Update SHUB: Modular frontend panels and auth logic fixes"
fi

# 5. Индексируем и сохраняем изменения
echo " Добавление файлов в индекс Git..."
git add .

echo " Фиксация изменений (git commit)..."
git commit -m "$commit_message"

# 6. Отправка кода на удаленный сервер
echo "===================================================="
echo " Отправка изменений в приватный репозиторий GitHub..."
echo "===================================================="
git push origin main

echo " ✅ Успешно! Все изменения синхронизированы с GitHub."
