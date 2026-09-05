package com.sunao.app;

import android.app.Application;
import android.util.Log;
import com.sunao.app.data.DatabaseHelper;
import com.sunao.app.webrtc.NativeBridge;

public class SunaoApp extends Application {
    private static final String TAG = "SunaoApp";
    private static SunaoApp instance;
    private DatabaseHelper databaseHelper;

    @Override
    public void onCreate() {
        super.onCreate();
        instance = this;
        
        // Initialize SQLite local storage
        databaseHelper = new DatabaseHelper(this);

        // Initialize Native C/C++ Engine
        try {
            String nativeVersion = NativeBridge.getInstance().getNativeEngineVersion();
            Log.i(TAG, "Native C++ Core Initialized: " + nativeVersion);
        } catch (Throwable t) {
            Log.e(TAG, "Failed to load native library: " + t.getMessage());
        }
    }

    public static SunaoApp getInstance() {
        return instance;
    }

    public DatabaseHelper getDatabaseHelper() {
        return databaseHelper;
    }
}
