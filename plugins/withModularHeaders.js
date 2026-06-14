/**
 * Plugin de Expo para agregar `use_modular_headers!` al Podfile de iOS.
 * Esto es necesario para resolver el conflicto entre AppCheckCore (Firebase)
 * y los pods GoogleUtilities / RecaptchaInterop que no definen módulos Swift.
 *
 * Este plugin se ejecuta automáticamente durante `expo prebuild` y en EAS Build,
 * por lo que el cambio sobrevive incluso si se regenera la carpeta /ios.
 */
const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withModularHeaders = (config) => {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      // Agregar use_modular_headers! si aún no está presente
      if (!podfile.includes('use_modular_headers!')) {
        podfile = podfile.replace(
          'prepare_react_native_project!',
          'use_modular_headers!\n\nprepare_react_native_project!'
        );
        console.log('✅ [withModularHeaders] use_modular_headers! agregado al Podfile.');
      }

      // Agregar GoogleUtilities y RecaptchaInterop con modular_headers => true
      // después del bloque de react-native-maps si aún no están presentes
      if (!podfile.includes("pod 'GoogleUtilities', :modular_headers => true")) {
        podfile = podfile.replace(
          '# @generated end react-native-maps',
          "# @generated end react-native-maps\n\n  # Fix: Swift pods requiring modular headers for Firebase/Google dependencies\n  pod 'GoogleUtilities', :modular_headers => true\n  pod 'RecaptchaInterop', :modular_headers => true"
        );
        console.log('✅ [withModularHeaders] Pods con modular_headers agregados.');
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
};

module.exports = withModularHeaders;
