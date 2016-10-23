# USTVNow Android App

![](./screenshot.jpg =480x266)

This is some pretty basic front-end code to compile from and sideload a Cordova .apk file 
for running especially on the Amazon FireTV. 

It essentially ```<iframe>```'s what exists on the USTVNow website, but overrides
some JS and CSS to allow a more friendly user experience on media viewing platforms
like the Amazon FireTV.

**Note:** Logins via all available methods (USTVNow, Google, Facebook) are handled through the `cordova-plugin-inappbrowser` window. It requires no direct code interfacing with this app... so your credentials are guaranteed to be confidential.

## Prerequisites

You should already have an understanding and system setup for compiling Android [Cordova](https://cordova.apache.org/) apps.

## Setup

Run this to get plugins and platforms initialized pre-compilation.

`cordova platform add android`

## Build/Installation

**Note:** You'll first have to enable your device for 3rd-party APK installs.

Run these in terminal:

* `cordova build android`
* `adb connect xxx.xxx.xxx.xxx` <- IP address of device
* `adb install path-to-file.apk` (use flag `-r` for reinstallling)
	* Commonly at: `platforms/android/build/outputs/apk/android-debug.apk`
	
### Quick installation

As long as you trust that the .apk file was built from this source, download the .apk from this repo and sideload it to your device.

## Remote Control Behaviors

Note: Currently, only the `>>` button does something

* `>>`: Toggles between fullscreen and guide

