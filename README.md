# USTVNow Android App

This is some pretty basic front-end code to compile from and sideload a Cordova .apk file 
for running especially on the Amazon FireTV. 

It essentially <iframe>'s what exists on the USTVNow website, but overrides
some JS and CSS to allow a more friendly user experience on media viewing platforms
like the Amazon FireTV.

## Prerequisites

You should already have an understanding and system setup for compiling Cordova apps.

## Compilation

`cordova build android`

## Installation

You'll first have to enable your device for 3rd-party APK installs.

`adb connect xxx.xxx.xxx.xxx` <- IP address of device
`adb install path-to-file.apk`