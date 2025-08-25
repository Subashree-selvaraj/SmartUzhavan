import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Network } from '@capacitor/network';
import { StatusBar } from '@capacitor/status-bar';
import { Keyboard } from '@capacitor/keyboard';
import { Haptics } from '@capacitor/haptics';
import { Preferences } from '@capacitor/preferences';

class CapacitorService {
  constructor() {
    this.isNative = Capacitor.isNativePlatform();
    this.platform = Capacitor.getPlatform();
    this.initializeApp();
  }

  async initializeApp() {
    if (this.isNative) {
      // Set status bar style
      await StatusBar.setStyle({ style: 'dark' });
      await StatusBar.setBackgroundColor({ color: '#4CAF50' });

      // Handle app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active?', isActive);
      });

      App.addListener('appUrlOpen', (data) => {
        console.log('App opened with URL:', data.url);
      });

      App.addListener('appRestoredResult', (data) => {
        console.log('Restored result:', data);
      });

      // Handle keyboard events
      Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('Keyboard will show with height:', info.keyboardHeight);
      });

      Keyboard.addListener('keyboardWillHide', () => {
        console.log('Keyboard will hide');
      });
    }
  }

  // Device Information
  async getDeviceInfo() {
    if (this.isNative) {
      const info = await Device.getInfo();
      return info;
    }
    return {
      name: 'Web Browser',
      model: 'Web',
      platform: 'web',
      operatingSystem: 'web',
      osVersion: 'web',
      manufacturer: 'web',
      isVirtual: false,
      webViewVersion: 'web'
    };
  }

  // Network Status
  async getNetworkStatus() {
    if (this.isNative) {
      const status = await Network.getStatus();
      return status;
    }
    return {
      connected: navigator.onLine,
      connectionType: 'unknown'
    };
  }

  // Network Status Listener
  async addNetworkListener(callback) {
    if (this.isNative) {
      Network.addListener('networkStatusChange', callback);
    } else {
      window.addEventListener('online', () => callback({ connected: true }));
      window.addEventListener('offline', () => callback({ connected: false }));
    }
  }

  // Haptic Feedback
  async hapticImpact(style = 'medium') {
    if (this.isNative) {
      await Haptics.impact({ style });
    }
  }

  async hapticSelection() {
    if (this.isNative) {
      await Haptics.selectionStart();
    }
  }

  // App Preferences
  async setPreference(key, value) {
    if (this.isNative) {
      await Preferences.set({ key, value: JSON.stringify(value) });
    } else {
      localStorage.setItem(key, JSON.stringify(value));
    }
  }

  async getPreference(key) {
    if (this.isNative) {
      const { value } = await Preferences.get({ key });
      return value ? JSON.parse(value) : null;
    } else {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    }
  }

  async removePreference(key) {
    if (this.isNative) {
      await Preferences.remove({ key });
    } else {
      localStorage.removeItem(key);
    }
  }

  // App Lifecycle
  async exitApp() {
    if (this.isNative) {
      await App.exitApp();
    }
  }

  async minimizeApp() {
    if (this.isNative) {
      await App.minimizeApp();
    }
  }

  // Keyboard Management
  async showKeyboard() {
    if (this.isNative) {
      await Keyboard.show();
    }
  }

  async hideKeyboard() {
    if (this.isNative) {
      await Keyboard.hide();
    }
  }

  async setAccessoryBarVisible(isVisible) {
    if (this.isNative) {
      await Keyboard.setAccessoryBarVisible({ isVisible });
    }
  }

  // App URL Handling
  async canOpenUrl(url) {
    if (this.isNative) {
      const { value } = await App.canOpenUrl({ url });
      return value;
    }
    return true;
  }

  async openUrl(url) {
    if (this.isNative) {
      await App.openUrl({ url });
    } else {
      window.open(url, '_blank');
    }
  }

  // Utility Methods
  isNativePlatform() {
    return this.isNative;
  }

  getPlatform() {
    return this.platform;
  }

  // Camera functionality (if needed)
  async takePicture() {
    if (this.isNative) {
      const { Camera } = await import('@capacitor/camera');
      const image = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: 'uri'
      });
      return image;
    }
    // Fallback for web
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({ webPath: e.target.result });
          };
          reader.readAsDataURL(file);
        }
      };
      input.click();
    });
  }
}

// Create singleton instance
const capacitorService = new CapacitorService();
export default capacitorService; 