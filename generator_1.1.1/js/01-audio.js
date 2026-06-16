        // ============================================
        // ОТЛАДКА - STARTUP LOG
        // ============================================
        console.log('[START] app.js loaded at', new Date().toISOString());
        
        // ============================================
        // ЗВУКОВАЯ СИСТЕМА (Web Audio API)
        // ============================================

        let audioCtx = null;
        let soundsEnabled = true;

        function getAudioContext() {
            if (!audioCtx) {
                audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            }
            return audioCtx;
        }

        function loadSoundsSetting() {
            const saved = localStorage.getItem('generator_sounds_enabled');
            if (saved !== null) {
                soundsEnabled = saved === 'true';
            }
        }
        loadSoundsSetting();

        function playTone(frequency, duration, type = 'sine', volume = 0.15, delay = 0) {
            if (!soundsEnabled) return;
            try {
                const ctx = getAudioContext();
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = type;
                osc.frequency.setValueAtTime(frequency, ctx.currentTime + delay);
                gain.gain.setValueAtTime(volume, ctx.currentTime + delay);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + duration);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(ctx.currentTime + delay);
                osc.stop(ctx.currentTime + delay + duration);
            } catch (e) { /* silently ignore */ }
        }

        // Звук генерации уведомления — восходящий аккорд
        function playGenerateSound() {
            playTone(523.25, 0.12, 'sine', 0.12, 0);      // C5
            playTone(659.25, 0.12, 'sine', 0.10, 0.06);    // E5
            playTone(783.99, 0.18, 'sine', 0.08, 0.12);    // G5
        }

        // Звук копирования — короткий клик
        function playCopySound() {
            playTone(880, 0.06, 'sine', 0.10, 0);
            playTone(1100, 0.08, 'sine', 0.08, 0.04);
        }

        // Звук отправки в Telegram — ascending chime
        function playTelegramSound() {
            playTone(660, 0.10, 'sine', 0.12, 0);
            playTone(880, 0.10, 'sine', 0.10, 0.08);
            playTone(1100, 0.15, 'sine', 0.08, 0.16);
        }

        // Звук отправки в Zimbra — мягкий двойной тон
        function playZimbraSound() {
            playTone(587.33, 0.12, 'sine', 0.12, 0);       // D5
            playTone(739.99, 0.15, 'sine', 0.10, 0.10);    // F#5
        }

        // Звук добавления в очередь — pop
        function playQueueAddSound() {
            playTone(440, 0.08, 'triangle', 0.15, 0);
            playTone(660, 0.10, 'triangle', 0.12, 0.05);
        }

        // Звук удаления из очереди — нисходящий
        function playQueueRemoveSound() {
            playTone(440, 0.10, 'sine', 0.10, 0);
            playTone(330, 0.12, 'sine', 0.08, 0.06);
        }

        // Звук ошибки — низкий buzz
        function playErrorSound() {
            playTone(200, 0.15, 'square', 0.08, 0);
            playTone(150, 0.20, 'square', 0.06, 0.10);
        }

        // Звук переключения типа — лёгкий tick
        function playSwitchSound() {
            playTone(600, 0.04, 'sine', 0.08, 0);
        }

        // Звук успешной отправки — fanfare
        function playSuccessSound() {
            playTone(523.25, 0.10, 'sine', 0.12, 0);       // C5
            playTone(659.25, 0.10, 'sine', 0.10, 0.08);    // E5
            playTone(783.99, 0.10, 'sine', 0.08, 0.16);    // G5
            playTone(1046.50, 0.20, 'sine', 0.06, 0.24);   // C6
        }

        // Звук уведомления (browser notification) — alert
        function playAlertSound() {
            playTone(800, 0.12, 'sine', 0.15, 0);
            playTone(800, 0.12, 'sine', 0.15, 0.20);
            playTone(1000, 0.20, 'sine', 0.12, 0.40);
        }
