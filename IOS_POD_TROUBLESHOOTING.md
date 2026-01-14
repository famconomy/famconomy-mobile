# iOS Pod Install Troubleshooting

## Boost Library Download Issue (React Native 0.72.x)

When running `pod install` for React Native 0.72.4, you may encounter a boost library download failure:

```
[!] Error installing boost
Verification checksum was incorrect, expected f0397ba6e982c4450f27bf32a2a83292aba035b827a5623a14636ea583318c41, got 1c162b579a423fa6876c6c5bc16d39ab4bc05e28898977a0a6af345f523f6357
```

Or this corrupt archive error:

```
[!] Error installing boost
tar: Error opening archive: Unrecognized archive format
```

### Root Cause

The default boost podspec uses `https://boostorg.jfrog.io/artifactory/main/release/1.76.0/source/boost_1_76_0.tar.bz2` which has been moved/decommissioned and redirects to a landing page instead of the actual file.

### Solution

Update the boost podspec to use the official Boost archives URL:

```bash
cd famconomy-mobile

# 1. Update the download URL
sed -i '' 's|https://boostorg.jfrog.io/artifactory/main/release|https://archives.boost.io/release|g' node_modules/react-native/third-party-podspecs/boost.podspec

# 2. Update the SHA256 checksum to match the official archive
sed -i '' 's/1c162b579a423fa6876c6c5bc16d39ab4bc05e28898977a0a6af345f523f6357/f0397ba6e982c4450f27bf32a2a83292aba035b827a5623a14636ea583318c41/' node_modules/react-native/third-party-podspecs/boost.podspec

# 3. Clear any cached corrupt downloads
rm -rf ~/Library/Caches/CocoaPods/Pods/Release/boost

# 4. Run pod install
cd ios && pod install
```

### One-liner Fix

```bash
cd famconomy-mobile && \
sed -i '' 's|https://boostorg.jfrog.io/artifactory/main/release|https://archives.boost.io/release|g' node_modules/react-native/third-party-podspecs/boost.podspec && \
rm -rf ~/Library/Caches/CocoaPods/Pods/Release/boost && \
cd ios && pod install
```

### Alternative: Patch File

Create a patch file to automate this fix after `npm install`:

**patches/boost-podspec.patch:**
```diff
--- a/node_modules/react-native/third-party-podspecs/boost.podspec
+++ b/node_modules/react-native/third-party-podspecs/boost.podspec
@@ -10,7 +10,7 @@ Pod::Spec.new do |spec|
   spec.homepage = 'http://www.boost.org'
   spec.summary = 'Boost provides free peer-reviewed portable C++ source libraries.'
   spec.authors = 'Rene Rivera'
-  spec.source = { :http => 'https://boostorg.jfrog.io/artifactory/main/release/1.76.0/source/boost_1_76_0.tar.bz2',
+  spec.source = { :http => 'https://archives.boost.io/release/1.76.0/source/boost_1_76_0.tar.bz2',
                   :sha256 => 'f0397ba6e982c4450f27bf32a2a83292aba035b827a5623a14636ea583318c41' }
```

Add to package.json scripts:
```json
{
  "scripts": {
    "postinstall": "patch -p1 < patches/boost-podspec.patch || true",
    "pod-install": "npm run fix-boost && cd ios && pod install",
    "fix-boost": "sed -i '' 's|https://boostorg.jfrog.io/artifactory/main/release|https://archives.boost.io/release|g' node_modules/react-native/third-party-podspecs/boost.podspec"
  }
}
```

### Verification

After the fix, the boost.podspec should contain:
```ruby
spec.source = { :http => 'https://archives.boost.io/release/1.76.0/source/boost_1_76_0.tar.bz2',
                :sha256 => 'f0397ba6e982c4450f27bf32a2a83292aba035b827a5623a14636ea583318c41' }
```

### When This Issue Occurs

- After running `npm install` (which resets node_modules)
- When setting up the project on a new machine
- After updating React Native version

### Last Updated

January 14, 2026 - React Native 0.72.4
