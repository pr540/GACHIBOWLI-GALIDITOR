#!/bin/bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

export JAVA_HOME="$HOME/.local/jdk17"
export ANDROID_SDK="$HOME/.local/android-sdk"
export BUILD_TOOLS="$ANDROID_SDK/build-tools/34.0.0"
export PATH="$JAVA_HOME/bin:$BUILD_TOOLS:$ANDROID_SDK/cmdline-tools/latest/bin:$PATH"

echo "=== 1. Cleaning build directories ==="
rm -rf build
mkdir -p build/gen build/obj build/dex

echo "=== 2. Creating debug keystore if needed ==="
if [ ! -f debug.keystore ]; then
    keytool -genkey -v -keystore debug.keystore -alias androiddebugkey \
        -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 \
        -dname "CN=Android Debug,O=Android,C=US"
fi

echo "=== 3. Compiling Android resources with AAPT2 ==="
aapt2 compile --dir app/src/main/res -o build/res.zip

echo "=== 4. Linking resources and generating R.java ==="
aapt2 link build/res.zip \
    -I "$ANDROID_SDK/platforms/android-34/android.jar" \
    --manifest app/src/main/AndroidManifest.xml \
    -A app/src/main/assets \
    -o build/app-unaligned.apk \
    --java build/gen \
    --min-sdk-version 24 \
    --target-sdk-version 34 \
    --version-code 3 \
    --version-name "1.2.0"

echo "=== 5. Compiling Java sources with javac ==="
javac -encoding UTF-8 \
    -cp "$ANDROID_SDK/platforms/android-34/android.jar" \
    -d build/obj \
    build/gen/com/splitops/ggsplitops/R.java \
    app/src/main/java/com/splitops/ggsplitops/MainActivity.java

echo "=== 6. Converting bytecode to DEX with D8 ==="
d8 build/obj/com/splitops/ggsplitops/*.class \
    --output build/dex/ \
    --lib "$ANDROID_SDK/platforms/android-34/android.jar"

echo "=== 7. Adding classes.dex to APK ==="
(cd build/dex && zip -u ../app-unaligned.apk classes.dex)

echo "=== 8. Aligning APK with zipalign ==="
zipalign -v -p 4 build/app-unaligned.apk build/app-aligned.apk > /dev/null

echo "=== 9. Signing APK with apksigner ==="
apksigner sign --ks debug.keystore \
    --ks-pass pass:android \
    --key-pass pass:android \
    --out ../../ggsplitops.apk \
    build/app-aligned.apk

echo "=== 10. Verifying APK signature ==="
apksigner verify ../../ggsplitops.apk

echo "================================================="
echo " SUCCESS! APK generated at: ggsplitops/ggsplitops.apk"
echo " File Size: $(ls -lh ../../ggsplitops.apk | awk '{print $5}')"
echo "================================================="
