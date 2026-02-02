/**
 * 共用音效系統
 * 提供統一的音效管理，支援所有遊戲使用
 */

class AudioSystem {
    constructor() {
        this.ctx = null;
        this.masterVolume = 0.7;
        this.sfxVolume = 0.8;
        this.musicVolume = 0.5;
        this.enabled = true;
        this.sounds = {};
        this.music = null;
        this.musicGain = null;
        this.sfxGain = null;
        
        this.init();
    }

    init() {
        try {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContext();
            
            // 建立主音量控制
            this.masterGain = this.ctx.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.ctx.destination);
            
            // 建立音效和音樂的分離音量控制
            this.sfxGain = this.ctx.createGain();
            this.sfxGain.gain.value = this.sfxVolume;
            this.sfxGain.connect(this.masterGain);
            
            this.musicGain = this.ctx.createGain();
            this.musicGain.gain.value = this.musicVolume;
            this.musicGain.connect(this.masterGain);
            
            // 預載基本音效
            this.preloadSounds();
            
            console.log('音效系統初始化成功');
        } catch (error) {
            console.warn('音效系統初始化失敗，將使用靜音模式:', error);
            this.enabled = false;
        }
    }

    preloadSounds() {
        // 基本遊戲音效
        this.sounds = {
            // 俄羅斯方塊音效
            'tetris-move': this.createBeep(200, 0.1, 'sine'),
            'tetris-rotate': this.createBeep(300, 0.1, 'sine'),
            'tetris-drop': this.createBeep(150, 0.15, 'square'),
            'tetris-clear': this.createBeep(800, 0.2, 'sine'),
            'tetris-clear4': this.createBeep(1000, 0.3, 'sine'),
            'tetris-levelup': this.createBeep(600, 0.5, 'triangle'),
            'tetris-gameover': this.createBeep(100, 0.8, 'sawtooth'),
            
            // 2048音效
            '2048-move': this.createBeep(400, 0.1, 'sine'),
            '2048-merge': this.createBeep(600, 0.2, 'sine'),
            '2048-new': this.createBeep(800, 0.15, 'triangle'),
            '2048-gameover': this.createBeep(200, 0.5, 'sawtooth'),
            
            // 3D射擊遊戲音效
            'shoot': this.createBeep(150, 0.2, 'square'),
            'shoot2': this.createBeep(600, 0.1, 'sawtooth'),
            'reload': this.createBeep(600, 0.1, 'square'),
            'pickup': this.createBeep(400, 0.1, 'sine'),
            'step': this.createBeep(100, 0.05, 'sine'),
            'boss': this.createBeep(50, 3.0, 'sawtooth'),
            'hit': this.createBeep(300, 0.1, 'sine'),
            'enemy-death': this.createBeep(200, 0.3, 'sawtooth'),
            
            // 通用音效
            'click': this.createBeep(500, 0.1, 'sine'),
            'hover': this.createBeep(300, 0.05, 'sine'),
            'success': this.createBeep(800, 0.2, 'triangle'),
            'error': this.createBeep(200, 0.3, 'sawtooth'),
            'countdown': this.createBeep(600, 0.1, 'square'),
            'countdown-final': this.createBeep(1000, 0.3, 'square')
        };
    }

    createBeep(frequency, duration, type = 'sine') {
        return {
            frequency,
            duration,
            type,
            play: (volume = 1.0, pitch = 1.0) => this.playBeep(frequency * pitch, duration, type, volume)
        };
    }

    playBeep(frequency, duration, type = 'sine', volume = 1.0) {
        if (!this.enabled || !this.ctx) return;
        
        try {
            if (this.ctx.state === 'suspended') {
                this.ctx.resume();
            }
            
            const oscillator = this.ctx.createOscillator();
            const gainNode = this.ctx.createGain();
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.ctx.currentTime);
            
            gainNode.gain.setValueAtTime(volume * this.sfxVolume, this.ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);
            
            oscillator.connect(gainNode);
            gainNode.connect(this.sfxGain);
            
            oscillator.start();
            oscillator.stop(this.ctx.currentTime + duration);
            
            return oscillator;
        } catch (error) {
            console.warn('播放音效失敗:', error);
        }
    }

    playSound(soundName, volume = 1.0, pitch = 1.0) {
        if (!this.enabled) return null;
        
        const sound = this.sounds[soundName];
        if (sound) {
            return sound.play(volume, pitch);
        } else {
            console.warn(`音效 "${soundName}" 未找到`);
            return null;
        }
    }

    playMusic(notes, tempo = 200) {
        if (!this.enabled || this.music) return;
        
        this.music = {
            notes,
            tempo,
            currentNote: 0,
            interval: null
        };
        
        this.playNextNote();
        
        this.music.interval = setInterval(() => {
            this.playNextNote();
        }, tempo);
    }

    playNextNote() {
        if (!this.music || !this.enabled) return;
        
        const { notes, currentNote } = this.music;
        const note = notes[currentNote % notes.length];
        
        if (note > 0) {
            this.playBeep(note, this.music.tempo / 1000, 'triangle', 0.3);
        }
        
        this.music.currentNote++;
    }

    stopMusic() {
        if (this.music && this.music.interval) {
            clearInterval(this.music.interval);
            this.music = null;
        }
    }

    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
        this.saveSettings();
    }

    setSfxVolume(volume) {
        this.sfxVolume = Math.max(0, Math.min(1, volume));
        if (this.sfxGain) {
            this.sfxGain.gain.value = this.sfxVolume;
        }
        this.saveSettings();
    }

    setMusicVolume(volume) {
        this.musicVolume = Math.max(0, Math.min(1, volume));
        if (this.musicGain) {
            this.musicGain.gain.value = this.musicVolume;
        }
        this.saveSettings();
    }

    toggleEnabled() {
        this.enabled = !this.enabled;
        if (!this.enabled) {
            this.stopMusic();
        }
        this.saveSettings();
        return this.enabled;
    }

    saveSettings() {
        try {
            const settings = {
                enabled: this.enabled,
                masterVolume: this.masterVolume,
                sfxVolume: this.sfxVolume,
                musicVolume: this.musicVolume
            };
            localStorage.setItem('audioSettings', JSON.stringify(settings));
        } catch (error) {
            console.warn('無法儲存音效設定:', error);
        }
    }

    loadSettings() {
        try {
            const saved = localStorage.getItem('audioSettings');
            if (saved) {
                const settings = JSON.parse(saved);
                this.enabled = settings.enabled !== false;
                this.setMasterVolume(settings.masterVolume || 0.7);
                this.setSfxVolume(settings.sfxVolume || 0.8);
                this.setMusicVolume(settings.musicVolume || 0.5);
            }
        } catch (error) {
            console.warn('無法載入音效設定:', error);
        }
    }

    // 遊戲特定音效序列
    playTetrisClearLines(count) {
        if (!this.enabled) return;
        
        if (count === 4) {
            this.playSound('tetris-clear4');
            // 額外的慶祝音效
            setTimeout(() => this.playBeep(1200, 0.2, 'sine', 0.8), 100);
            setTimeout(() => this.playBeep(1400, 0.2, 'sine', 0.8), 200);
        } else {
            this.playSound('tetris-clear');
        }
    }

    play2048Merge(value) {
        if (!this.enabled) return;
        
        this.playSound('2048-merge');
        // 根據合併的數字調整音高
        const pitch = Math.min(2.0, 1.0 + (Math.log2(value) * 0.1));
        setTimeout(() => this.playBeep(800 * pitch, 0.15, 'triangle', 0.6), 50);
    }
}

// 建立全局音效系統實例
window.AudioSystem = AudioSystem;
window.audioSystem = new AudioSystem();

// 自動載入設定
window.addEventListener('load', () => {
    if (window.audioSystem) {
        window.audioSystem.loadSettings();
    }
});

// 提供簡易API
window.playSound = (name, volume, pitch) => {
    if (window.audioSystem) {
        return window.audioSystem.playSound(name, volume, pitch);
    }
    return null;
};

window.toggleAudio = () => {
    if (window.audioSystem) {
        return window.audioSystem.toggleEnabled();
    }
    return false;
};

export default AudioSystem;