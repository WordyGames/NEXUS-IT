import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Switch,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  Attachment,
  Company,
  Equipment,
  User,
  createEquipment,
  generateStoragePath,
  getEquipment,
  getUsers,
  storage,
  triggerEquipmentNotifications
} from '@nexus-it/shared';
import { useAuth } from '../contexts/AuthContext';
import { detectCurrentMobileDevice } from '../utils/deviceDetection';
import { generateCartaResponsivaMobile } from '../utils/cartaResponsivaMobile';
import { SignatureData, SignaturePad } from '../components/SignaturePad';

const generateEntityId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `equipment-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const generateAttachmentId = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return `att-mobile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const sanitize = (value: string): string => value.trim();

type CartaOutputMode = 'print' | 'pdf' | 'print_and_pdf';

const buildInitialForm = (company: Company) => ({
  company,
  name: '',
  location: '',
  assignedTo: '',
  notes: '',
  specs: {
    manufacturer: '',
    model: '',
    serialNumber: '',
    imei: '',
    phoneNumber: '',
    googleAccountEmail: '',
    googleAccountPassword: '',
    os: '',
    hostname: '',
    cpu: '',
    ram: '',
    storage: '',
    ipAddress: '',
    macAddress: ''
  }
});

const MobileEnrollmentScreen = () => {
  const { userData, isAdmin } = useAuth();
  const defaultCompany = (userData?.company || Company.GRUPO_AMEX) as Company;
  const [form, setForm] = useState(() => buildInitialForm(defaultCompany));
  const [currentEntityId, setCurrentEntityId] = useState(() => generateEntityId());
  const [photoAttachment, setPhotoAttachment] = useState<Attachment | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [detecting, setDetecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showGooglePassword, setShowGooglePassword] = useState(false);
  const [detectedEquipmentType, setDetectedEquipmentType] = useState<'phone' | 'tablet'>('phone');
  const [letterLoadingId, setLetterLoadingId] = useState<string | null>(null);
  const [includeEmployeeSignature, setIncludeEmployeeSignature] = useState(false);
  const [employeeSignature, setEmployeeSignature] = useState<SignatureData | null>(null);

  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      company: (isAdmin ? prev.company : defaultCompany)
    }));
  }, [defaultCompany, isAdmin]);

  useEffect(() => {
    void loadData();
  }, [userData?.company]);

  useEffect(() => {
    if (!form.assignedTo) return;

    const assignedUser = users.find((user) => user.id === form.assignedTo);
    const assignedPhone = assignedUser?.phone?.trim() || '';
    if (!assignedPhone) return;

    setForm((prev) => ({
      ...prev,
      specs: {
        ...prev.specs,
        phoneNumber: assignedPhone
      }
    }));
  }, [form.assignedTo, users]);

  const activeUsers = useMemo(
    () => users.filter((user) => user.isActive),
    [users]
  );

  const loadData = async () => {
    setLoading(true);
    try {
      const equipmentFilters = userData?.company
        ? { company: userData.company as Company }
        : undefined;
      const [usersData, equipmentData] = await Promise.all([
        getUsers(),
        getEquipment(equipmentFilters)
      ]);
      setUsers(usersData);
      setEquipmentList(equipmentData);
    } catch (error) {
      console.error('Error loading mobile enrollment data:', error);
      Alert.alert('Error', 'No se pudo cargar la información inicial');
    } finally {
      setLoading(false);
    }
  };

  const handleDetectDevice = async () => {
    setDetecting(true);
    try {
      const detected = await detectCurrentMobileDevice();
      setForm((prev) => ({
        ...prev,
        name: detected.name || prev.name,
        location: prev.location || detected.location,
        notes: prev.notes || detected.notes || '',
        specs: {
          ...prev.specs,
          ...detected.specs
        }
      }));
      setDetectedEquipmentType(detected.detectedEquipmentType || 'phone');
      Alert.alert('Detección completa', 'Se detectaron las especificaciones del celular');
    } catch (error) {
      console.error('Error detecting mobile device info:', error);
      Alert.alert('Error', 'No se pudo detectar la información del dispositivo');
    } finally {
      setDetecting(false);
    }
  };

  const uploadImage = async (uri: string): Promise<Attachment> => {
    const filename = uri.split('/').pop() || `mobile-photo-${Date.now()}.jpg`;
    const storagePath = generateStoragePath('equipment', currentEntityId, filename);
    const storageRef = ref(storage, storagePath);

    const response = await fetch(uri);
    const blob = await response.blob();

    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);

    return {
      id: generateAttachmentId(),
      fileName: filename,
      fileType: 'image/jpeg',
      fileSize: blob.size,
      url: downloadURL,
      storagePath,
      uploadedBy: userData?.id || 'mobile-user',
      uploadedByName: userData?.name || 'Usuario móvil',
      createdAt: new Date()
    };
  };

  const handleSelectPhoto = async (fromCamera: boolean) => {
    try {
      const permissionResponse = fromCamera
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResponse.granted) {
        Alert.alert('Permiso requerido', 'Debes permitir acceso a la cámara o galería');
        return;
      }

      const pickerResult = fromCamera
        ? await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.8,
          mediaTypes: ImagePicker.MediaTypeOptions.Images
        })
        : await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.8,
          mediaTypes: ImagePicker.MediaTypeOptions.Images
        });

      if (pickerResult.canceled) return;

      const asset = pickerResult.assets[0];
      if (!asset?.uri) return;

      setUploading(true);
      const attachment = await uploadImage(asset.uri);
      setPhotoAttachment(attachment);
    } catch (error) {
      console.error('Error selecting/uploading photo:', error);
      Alert.alert('Error', 'No se pudo subir la foto del equipo');
    } finally {
      setUploading(false);
    }
  };

  const findUserById = (id?: string): User | undefined => (
    id ? users.find((user) => user.id === id) : undefined
  );

  const handleGenerateCarta = async (
    equipmentItem: Equipment,
    mode: CartaOutputMode = 'pdf'
  ) => {
    const employee = findUserById(equipmentItem.assignedTo);
    if (!employee) {
      Alert.alert(
        'Equipo sin asignar',
        'Asigna un usuario al equipo para poder generar la carta responsiva'
      );
      return;
    }

    if (includeEmployeeSignature && !employeeSignature) {
      Alert.alert(
        'Firma pendiente',
        'Activa "Incluir firma del empleado" solo si ya se capturó la firma digital.'
      );
      return;
    }

    setLetterLoadingId(equipmentItem.id);
    try {
      const printDirectly = mode === 'print' || mode === 'print_and_pdf';
      const sharePdf = mode === 'pdf' || mode === 'print_and_pdf';

      await generateCartaResponsivaMobile({
        employee,
        equipment: equipmentItem,
        generatedBy: userData?.name || 'Sistema',
        notes: equipmentItem.notes
      }, {
        includeEmployeeSignature,
        employeeSignatureSvg: includeEmployeeSignature ? employeeSignature?.svg || null : null,
        printDirectly,
        sharePdf
      });
    } catch (error) {
      console.error('Error generating mobile carta responsiva:', error);
      Alert.alert('Error', 'No se pudo generar la carta responsiva');
    } finally {
      setLetterLoadingId(null);
    }
  };

  const resetFormState = () => {
    const company = isAdmin ? form.company : defaultCompany;
    setForm(buildInitialForm(company));
    setCurrentEntityId(generateEntityId());
    setPhotoAttachment(null);
    setShowGooglePassword(false);
    setDetectedEquipmentType('phone');
  };

  const handleSaveEquipment = async () => {
    const name = sanitize(form.name);
    const location = sanitize(form.location);
    const notes = sanitize(form.notes);
    const specs = {
      manufacturer: sanitize(form.specs.manufacturer),
      model: sanitize(form.specs.model),
      serialNumber: sanitize(form.specs.serialNumber),
      imei: sanitize(form.specs.imei),
      phoneNumber: sanitize(form.specs.phoneNumber),
      googleAccountEmail: sanitize(form.specs.googleAccountEmail),
      googleAccountPassword: sanitize(form.specs.googleAccountPassword),
      os: sanitize(form.specs.os),
      hostname: sanitize(form.specs.hostname),
      cpu: sanitize(form.specs.cpu),
      ram: sanitize(form.specs.ram),
      storage: sanitize(form.specs.storage),
      ipAddress: sanitize(form.specs.ipAddress),
      macAddress: sanitize(form.specs.macAddress)
    };

    if (!name) {
      Alert.alert('Dato requerido', 'Ingresa un nombre para el equipo');
      return;
    }

    if (!location) {
      Alert.alert('Dato requerido', 'Ingresa una ubicación');
      return;
    }

    if (specs.googleAccountEmail && !specs.googleAccountPassword) {
      Alert.alert('Dato requerido', 'Ingresa la clave de la cuenta Google para este equipo');
      return;
    }

    if (specs.googleAccountPassword && !specs.googleAccountEmail) {
      Alert.alert('Dato requerido', 'Captura también el correo de la cuenta Google');
      return;
    }

    setSaving(true);
    try {
      const assignedUser = findUserById(form.assignedTo);
      const assignedPhone = sanitize(assignedUser?.phone || '');
      const resolvedPhoneNumber = specs.phoneNumber || assignedPhone;

      const payload = {
        id: currentEntityId,
        company: form.company as Company,
        name,
        type: detectedEquipmentType,
        location,
        status: 'active' as const,
        assignedTo: form.assignedTo || undefined,
        notes: notes || undefined,
        specs: {
          ...specs,
          phoneNumber: resolvedPhoneNumber
        },
        attachments: photoAttachment ? [photoAttachment] : [],
        createdBy: userData?.id || 'mobile-user'
      };

      const createdId = await createEquipment(payload);
      const createdEquipment: Equipment = {
        ...payload,
        id: createdId,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await triggerEquipmentNotifications(createdEquipment);
      setEquipmentList((prev) => [createdEquipment, ...prev]);

      Alert.alert(
        'Equipo registrado',
        'Se guardó el equipo correctamente',
        [
          {
            text: 'Imprimir carta',
            onPress: () => {
              void handleGenerateCarta(createdEquipment, 'print');
            }
          },
          {
            text: 'PDF',
            onPress: () => {
              void handleGenerateCarta(createdEquipment, 'pdf');
            }
          },
          {
            text: 'Listo',
            style: 'cancel'
          }
        ]
      );

      resetFormState();
    } catch (error) {
      console.error('Error creating equipment from mobile:', error);
      Alert.alert('Error', 'No se pudo guardar el equipo');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#1d4ed8" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Alta de Equipo desde Celular</Text>
      <Text style={styles.subtitle}>
        Detecta automáticamente este dispositivo, guárdalo en inventario y genera su carta responsiva con o sin firma.
      </Text>

      <TouchableOpacity
        style={[styles.primaryButton, detecting && styles.buttonDisabled]}
        onPress={() => { void handleDetectDevice(); }}
        disabled={detecting}
      >
        <Text style={styles.primaryButtonText}>
          {detecting ? 'Detectando...' : 'Detectar especificaciones del celular'}
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Datos del Equipo</Text>

        <Text style={styles.label}>Tipo detectado</Text>
        <View style={styles.typeChipRow}>
          <TouchableOpacity
            style={[styles.chip, detectedEquipmentType === 'phone' && styles.chipSelected]}
            onPress={() => setDetectedEquipmentType('phone')}
          >
            <Text style={[styles.chipText, detectedEquipmentType === 'phone' && styles.chipTextSelected]}>
              Teléfono
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chip, detectedEquipmentType === 'tablet' && styles.chipSelected]}
            onPress={() => setDetectedEquipmentType('tablet')}
          >
            <Text style={[styles.chipText, detectedEquipmentType === 'tablet' && styles.chipTextSelected]}>
              Tablet
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Empresa</Text>
        {isAdmin ? (
          <View style={styles.companyRow}>
            {Object.values(Company).map((company) => (
              <TouchableOpacity
                key={company}
                style={[
                  styles.chip,
                  form.company === company && styles.chipSelected
                ]}
                onPress={() => setForm((prev) => ({ ...prev, company }))}
              >
                <Text
                  style={[
                    styles.chipText,
                    form.company === company && styles.chipTextSelected
                  ]}
                >
                  {company}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <TextInput style={styles.input} value={form.company} editable={false} />
        )}

        <Text style={styles.label}>Nombre del equipo</Text>
        <TextInput
          style={styles.input}
          value={form.name}
          onChangeText={(value) => setForm((prev) => ({ ...prev, name: value }))}
          placeholder="Ej: Samsung A54 / iPhone"
        />

        <Text style={styles.label}>Ubicación</Text>
        <TextInput
          style={styles.input}
          value={form.location}
          onChangeText={(value) => setForm((prev) => ({ ...prev, location: value }))}
          placeholder="Ej: Oficina central"
        />

        <Text style={styles.label}>Asignar a</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.assigneeRow}>
          <TouchableOpacity
            style={[styles.userChip, !form.assignedTo && styles.userChipSelected]}
            onPress={() => setForm((prev) => ({ ...prev, assignedTo: '' }))}
          >
            <Text style={[styles.userChipText, !form.assignedTo && styles.userChipTextSelected]}>
              Sin asignar
            </Text>
          </TouchableOpacity>
          {activeUsers.map((user) => (
            <TouchableOpacity
              key={user.id}
              style={[styles.userChip, form.assignedTo === user.id && styles.userChipSelected]}
              onPress={() => setForm((prev) => ({ ...prev, assignedTo: user.id }))}
            >
              <Text style={[styles.userChipText, form.assignedTo === user.id && styles.userChipTextSelected]}>
                {user.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}>Notas</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          value={form.notes}
          onChangeText={(value) => setForm((prev) => ({ ...prev, notes: value }))}
          placeholder="Observaciones adicionales"
          multiline
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Especificaciones detectadas</Text>
        <TextInput
          style={styles.input}
          value={form.specs.manufacturer}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, manufacturer: value } }))}
          placeholder="Fabricante"
        />
        <TextInput
          style={styles.input}
          value={form.specs.model}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, model: value } }))}
          placeholder="Modelo"
        />
        <TextInput
          style={styles.input}
          value={form.specs.serialNumber}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, serialNumber: value } }))}
          placeholder="Serial / identificador"
        />
        <TextInput
          style={styles.input}
          value={form.specs.imei}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, imei: value } }))}
          placeholder="IMEI (manual)"
          keyboardType="number-pad"
        />
        <TextInput
          style={styles.input}
          value={form.specs.phoneNumber}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, phoneNumber: value } }))}
          placeholder="Teléfono de línea / SIM (manual)"
          keyboardType="default"
          inputMode="tel"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <Text style={styles.fieldInlineLabel}>Cuenta Google (correo)</Text>
        <TextInput
          style={styles.input}
          value={form.specs.googleAccountEmail}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, googleAccountEmail: value } }))}
          placeholder="Cuenta Google (correo, manual)"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.passwordHeaderRow}>
          <Text style={styles.fieldInlineLabel}>Clave de cuenta Google (la asigna TI)</Text>
          <TouchableOpacity
            onPress={() => setShowGooglePassword((prev) => !prev)}
            style={styles.passwordToggle}
          >
            <Text style={styles.passwordToggleText}>{showGooglePassword ? 'Ocultar' : 'Mostrar'}</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={styles.input}
          value={form.specs.googleAccountPassword}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, googleAccountPassword: value } }))}
          placeholder="Clave que asignas al equipo"
          secureTextEntry={!showGooglePassword}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TextInput
          style={styles.input}
          value={form.specs.os}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, os: value } }))}
          placeholder="Sistema operativo"
        />
        <TextInput
          style={styles.input}
          value={form.specs.hostname}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, hostname: value } }))}
          placeholder="Nombre del dispositivo"
        />
        <TextInput
          style={styles.input}
          value={form.specs.cpu}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, cpu: value } }))}
          placeholder="CPU"
        />
        <TextInput
          style={styles.input}
          value={form.specs.ram}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, ram: value } }))}
          placeholder="RAM"
        />
        <TextInput
          style={styles.input}
          value={form.specs.storage}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, storage: value } }))}
          placeholder="Almacenamiento"
        />
        <TextInput
          style={styles.input}
          value={form.specs.ipAddress}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, ipAddress: value } }))}
          placeholder="IP (opcional)"
        />
        <TextInput
          style={styles.input}
          value={form.specs.macAddress}
          onChangeText={(value) => setForm((prev) => ({ ...prev, specs: { ...prev.specs, macAddress: value } }))}
          placeholder="MAC (opcional)"
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Foto del equipo</Text>
        <View style={styles.photoButtonsRow}>
          <TouchableOpacity
            style={[styles.secondaryButton, uploading && styles.buttonDisabled]}
            onPress={() => { void handleSelectPhoto(true); }}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>Tomar foto</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryButton, uploading && styles.buttonDisabled]}
            onPress={() => { void handleSelectPhoto(false); }}
            disabled={uploading}
          >
            <Text style={styles.secondaryButtonText}>Elegir de galería</Text>
          </TouchableOpacity>
        </View>
        {photoAttachment && (
          <View style={styles.photoPreviewContainer}>
            <Image source={{ uri: photoAttachment.url }} style={styles.photoPreview} />
            <Text style={styles.photoName}>{photoAttachment.fileName}</Text>
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Firma en celular y salida de carta</Text>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Incluir firma digital del empleado en la carta</Text>
          <Switch
            value={includeEmployeeSignature}
            onValueChange={setIncludeEmployeeSignature}
            trackColor={{ false: '#d1d5db', true: '#93c5fd' }}
            thumbColor={includeEmployeeSignature ? '#1d4ed8' : '#f9fafb'}
          />
        </View>

        {includeEmployeeSignature ? (
          <View style={styles.signatureContainer}>
            <Text style={styles.signatureHint}>
              Pide al usuario que firme con el dedo. Si prefieres firma física, desactiva esta opción.
            </Text>
            <SignaturePad onChange={setEmployeeSignature} />
            <Text style={styles.signatureMeta}>
              {employeeSignature
                ? `Firma capturada (${employeeSignature.pointCount} trazos)`
                : 'Aún no hay firma capturada'}
            </Text>
          </View>
        ) : (
          <Text style={styles.signatureHint}>
            La carta se genera sin firma digital para imprimir y firmar después en papel.
          </Text>
        )}
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, saving && styles.buttonDisabled]}
        onPress={() => { void handleSaveEquipment(); }}
        disabled={saving}
      >
        <Text style={styles.primaryButtonText}>
          {saving ? 'Guardando...' : 'Guardar equipo detectado'}
        </Text>
      </TouchableOpacity>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Equipos registrados</Text>
        {equipmentList.length === 0 ? (
          <Text style={styles.emptyText}>No hay equipos registrados para esta empresa</Text>
        ) : (
          equipmentList.slice(0, 12).map((eq) => {
            const assignedUser = findUserById(eq.assignedTo);
            const isGenerating = letterLoadingId === eq.id;
            return (
              <View key={eq.id} style={styles.equipmentItem}>
                <Text style={styles.equipmentName}>{eq.name}</Text>
                <Text style={styles.equipmentMeta}>{eq.company}</Text>
                <Text style={styles.equipmentMeta}>
                  Asignado a: {assignedUser?.name || 'Sin asignar'}
                </Text>
                <View style={styles.letterButtonsRow}>
                  <TouchableOpacity
                    style={[styles.letterButton, isGenerating && styles.buttonDisabled]}
                    onPress={() => { void handleGenerateCarta(eq, 'print'); }}
                    disabled={isGenerating}
                  >
                    <Text style={styles.letterButtonText}>
                      {isGenerating ? 'Generando...' : 'Imprimir carta'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.letterButton, styles.letterButtonSecondary, isGenerating && styles.buttonDisabled]}
                    onPress={() => { void handleGenerateCarta(eq, 'pdf'); }}
                    disabled={isGenerating}
                  >
                    <Text style={styles.letterButtonText}>
                      PDF / Compartir
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f3f4f6'
  },
  content: {
    padding: 16,
    gap: 12
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#111827'
  },
  subtitle: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 8
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 10
  },
  label: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 6,
    marginTop: 4
  },
  fieldInlineLabel: {
    fontSize: 12,
    color: '#1f2937',
    fontWeight: '700',
    marginBottom: 4,
    marginTop: 2
  },
  passwordHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  passwordToggle: {
    borderWidth: 1,
    borderColor: '#1d4ed8',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#eff6ff'
  },
  passwordToggleText: {
    fontSize: 11,
    color: '#1d4ed8',
    fontWeight: '700'
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#fff',
    marginBottom: 8
  },
  notesInput: {
    minHeight: 76,
    textAlignVertical: 'top'
  },
  companyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8
  },
  typeChipRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8
  },
  chip: {
    borderWidth: 1,
    borderColor: '#93c5fd',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#eff6ff'
  },
  chipSelected: {
    backgroundColor: '#1d4ed8',
    borderColor: '#1d4ed8'
  },
  chipText: {
    fontSize: 12,
    color: '#1e40af'
  },
  chipTextSelected: {
    color: '#ffffff'
  },
  assigneeRow: {
    marginBottom: 10
  },
  userChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#ffffff',
    marginRight: 8
  },
  userChipSelected: {
    borderColor: '#1d4ed8',
    backgroundColor: '#dbeafe'
  },
  userChipText: {
    fontSize: 12,
    color: '#374151'
  },
  userChipTextSelected: {
    color: '#1e3a8a',
    fontWeight: '700'
  },
  primaryButton: {
    backgroundColor: '#1d4ed8',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center'
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 14
  },
  secondaryButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#1d4ed8',
    paddingVertical: 10,
    alignItems: 'center'
  },
  secondaryButtonText: {
    color: '#1d4ed8',
    fontWeight: '600',
    fontSize: 13
  },
  photoButtonsRow: {
    flexDirection: 'row',
    gap: 10
  },
  photoPreviewContainer: {
    marginTop: 12,
    alignItems: 'center'
  },
  photoPreview: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    backgroundColor: '#e5e7eb'
  },
  photoName: {
    marginTop: 8,
    fontSize: 12,
    color: '#4b5563'
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  switchLabel: {
    flex: 1,
    fontSize: 13,
    color: '#1f2937',
    fontWeight: '600'
  },
  signatureContainer: {
    marginTop: 10,
    gap: 8
  },
  signatureHint: {
    marginTop: 8,
    fontSize: 12,
    color: '#4b5563',
    lineHeight: 18
  },
  signatureMeta: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '600'
  },
  equipmentItem: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10
  },
  equipmentName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4
  },
  equipmentMeta: {
    fontSize: 12,
    color: '#4b5563',
    marginBottom: 2
  },
  letterButton: {
    backgroundColor: '#0f766e',
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: 'center',
    flex: 1
  },
  letterButtonsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8
  },
  letterButtonSecondary: {
    backgroundColor: '#1d4ed8'
  },
  letterButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12
  },
  buttonDisabled: {
    opacity: 0.6
  },
  emptyText: {
    fontSize: 13,
    color: '#6b7280'
  }
});

export default MobileEnrollmentScreen;
