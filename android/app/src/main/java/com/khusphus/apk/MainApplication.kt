package com.khusphus.apk

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

import com.facebook.react.ReactInstanceEventListener
import com.facebook.react.bridge.ReactContext

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList = PackageList(this).packages.apply {
        add(AudioRoutePackage())
        add(CallIntentPackage())
        add(TelecomPackage())
        add(CallWakeLockPackage())
      }
    )
  }

  override fun onCreate() {
    super.onCreate()
    CallState.init(applicationContext)

    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)

    try {
      reactHost.addReactInstanceEventListener(object : ReactInstanceEventListener {
        override fun onReactContextInitialized(context: ReactContext) {
          TelecomModule.onReactContextReady(context)
        }
      })
    } catch (e: Exception) {}
  }

  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}
