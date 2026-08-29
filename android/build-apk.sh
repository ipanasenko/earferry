#!/bin/sh
set -eu

PROJECT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
SDK_DIR=${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}
BUILD_TOOLS_VERSION=${BUILD_TOOLS_VERSION:-35.0.0}
PLATFORM_VERSION=${PLATFORM_VERSION:-35}
VERSION_CODE=${VERSION_CODE:-1}
VERSION_NAME=${VERSION_NAME:-1.0}
TOOLS_DIR="$SDK_DIR/build-tools/$BUILD_TOOLS_VERSION"
ANDROID_JAR="$SDK_DIR/platforms/android-$PLATFORM_VERSION/android.jar"
BUILD_DIR="$PROJECT_DIR/build"
COMPILED_DIR="$BUILD_DIR/compiled"
GENERATED_DIR="$BUILD_DIR/generated"
CLASSES_DIR="$BUILD_DIR/classes"
DEX_DIR="$BUILD_DIR/dex"
KEYSTORE_DIR="$PROJECT_DIR/.debug"
KEYSTORE="$KEYSTORE_DIR/earferry-debug.keystore"
UNSIGNED_APK="$BUILD_DIR/earferry-unsigned.apk"
ALIGNED_APK="$BUILD_DIR/earferry-aligned.apk"
OUTPUT_APK="$BUILD_DIR/earferry.apk"

for TOOL in aapt2 d8 zipalign apksigner; do
  if [ ! -x "$TOOLS_DIR/$TOOL" ]; then
    echo "Missing $TOOLS_DIR/$TOOL" >&2
    exit 1
  fi
done

if [ ! -f "$ANDROID_JAR" ]; then
  echo "Missing $ANDROID_JAR" >&2
  exit 1
fi

rm -rf "$BUILD_DIR"
mkdir -p "$COMPILED_DIR" "$GENERATED_DIR" "$CLASSES_DIR" "$DEX_DIR" "$KEYSTORE_DIR"

"$TOOLS_DIR/aapt2" compile --dir "$PROJECT_DIR/app/src/main/res" -o "$COMPILED_DIR"
"$TOOLS_DIR/aapt2" link \
  -I "$ANDROID_JAR" \
  --manifest "$PROJECT_DIR/app/src/main/AndroidManifest.xml" \
  --java "$GENERATED_DIR" \
  --min-sdk-version 23 \
  --target-sdk-version 35 \
  --version-code "$VERSION_CODE" \
  --version-name "$VERSION_NAME" \
  -o "$UNSIGNED_APK" \
  "$COMPILED_DIR"/*.flat

javac -source 17 -target 17 -classpath "$ANDROID_JAR" -d "$CLASSES_DIR" \
  "$GENERATED_DIR/com/ipanasenko/earferry/R.java" \
  "$PROJECT_DIR/app/src/main/java/com/ipanasenko/earferry/ShareUrl.java" \
  "$PROJECT_DIR/app/src/main/java/com/ipanasenko/earferry/MainActivity.java"

jar --create --file "$BUILD_DIR/classes.jar" -C "$CLASSES_DIR" .
"$TOOLS_DIR/d8" --lib "$ANDROID_JAR" --min-api 23 --output "$DEX_DIR" "$BUILD_DIR/classes.jar"
(cd "$DEX_DIR" && zip -q -j "$UNSIGNED_APK" classes.dex)
"$TOOLS_DIR/zipalign" -f 4 "$UNSIGNED_APK" "$ALIGNED_APK"

if [ ! -f "$KEYSTORE" ]; then
  keytool -genkeypair -noprompt \
    -keystore "$KEYSTORE" \
    -storepass android \
    -keypass android \
    -alias androiddebugkey \
    -dname "CN=EarFerry Debug,O=EarFerry,C=NL" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000
fi

"$TOOLS_DIR/apksigner" sign \
  --ks "$KEYSTORE" \
  --ks-pass pass:android \
  --key-pass pass:android \
  --out "$OUTPUT_APK" \
  "$ALIGNED_APK"
"$TOOLS_DIR/apksigner" verify --verbose "$OUTPUT_APK"

echo "$OUTPUT_APK"
