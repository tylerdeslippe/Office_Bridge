# CloudKit Setup Guide for Office Bridge

## Overview

This guide walks you through setting up CloudKit (Apple's iCloud sync service) for Office Bridge. CloudKit enables:
- **Free cloud storage** (included with Apple Developer account)
- **Device-to-device sync** for the same user
- **Team sharing** so multiple users can share the same data
- **Offline support** with automatic sync when back online

## Prerequisites

1. **Apple Developer Account** ($99/year) - https://developer.apple.com
2. **Mac with Xcode 15+**
3. **Office Bridge project** with Capacitor iOS platform added

## Step 1: Enable CloudKit in Xcode

### 1.1 Open Your Project in Xcode

```bash
cd frontend
npx cap open ios
```

### 1.2 Add CloudKit Capability

1. Select your **project** in the navigator (blue icon at top)
2. Select your **target** (App)
3. Go to **Signing & Capabilities** tab
4. Click **+ Capability**
5. Search for and add **iCloud**

### 1.3 Configure iCloud Settings

In the iCloud capability section:
1. Check **CloudKit**
2. Check **Use default container** OR create a custom one
3. Your container ID should be: `iCloud.com.faithfulandtrue.officebridge`

### 1.4 Add Push Notifications (for sync notifications)

1. Click **+ Capability** again
2. Add **Push Notifications**
3. Add **Background Modes**
4. Check **Remote notifications** in Background Modes

## Step 2: Create CloudKit Schema

### 2.1 Open CloudKit Dashboard

1. Go to https://icloud.developer.apple.com/
2. Sign in with your developer account
3. Select your container: `iCloud.com.faithfulandtrue.officebridge`

### 2.2 Create Record Types

Click **Schema** → **Record Types** → **+** to create each type:

#### Company
| Field Name | Type |
|------------|------|
| name | String |
| createdAt | Date/Time |

#### Project
| Field Name | Type |
|------------|------|
| name | String |
| number | String |
| status | String |
| buildingType | String |
| address | String |
| city | String |
| state | String |
| zip | String |
| latitude | Double |
| longitude | Double |
| startDate | String |
| endDate | String |
| contacts | String (JSON) |
| areas | String (JSON) |
| scopeDescription | String |
| contractValue | Double |
| createdBy | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### Delivery
| Field Name | Type |
|------------|------|
| projectId | String |
| supplierName | String |
| supplierPhone | String |
| supplierContact | String |
| poNumber | String |
| description | String |
| contents | String (JSON) |
| trackingNumber | String |
| carrier | String |
| orderDate | String |
| releaseDate | String |
| estimatedArrival | String |
| actualArrival | String |
| isReleased | Int64 |
| isDelivered | Int64 |
| notify24hr | Int64 |
| notes | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### DailyReport
| Field Name | Type |
|------------|------|
| projectId | String |
| projectName | String |
| reportDate | String |
| foreman | String |
| level | String |
| unitSystem | String |
| crewMembers | String (JSON) |
| totalCrewCount | Int64 |
| totalManHours | Double |
| equipmentUsed | String (JSON) |
| workSummary | String |
| problemsEncountered | String |
| hasProblems | Int64 |
| rfiRequired | Int64 |
| rfiDescription | String |
| photoIds | String (JSON) |
| status | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### Task
| Field Name | Type |
|------------|------|
| projectId | String |
| title | String |
| description | String |
| assignedTo | String |
| assignedToName | String |
| status | String |
| priority | String |
| dueDate | String |
| completedAt | String |
| area | String |
| phase | String |
| costCode | String |
| notes | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### Contact
| Field Name | Type |
|------------|------|
| type | String |
| companyName | String |
| contactName | String |
| title | String |
| phone | String |
| mobile | String |
| email | String |
| address | String |
| city | String |
| state | String |
| zip | String |
| notes | String |
| useCount | Int64 |
| lastUsed | Date/Time |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### PurchaseOrder
| Field Name | Type |
|------------|------|
| projectId | String |
| poNumber | String |
| jobNumber | String |
| jobName | String |
| date | String |
| vendorName | String |
| vendorAddress | String |
| vendorPhone | String |
| vendorContact | String |
| shipToName | String |
| shipToAddress | String |
| lineItems | String (JSON) |
| subtotal | Double |
| taxRate | Double |
| taxAmount | Double |
| total | Double |
| status | String |
| specialInstructions | String |
| createdBy | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### LookAhead
| Field Name | Type |
|------------|------|
| projectId | String |
| date | String |
| manpower | Int64 |
| plannedWork | String (JSON) |
| notes | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### Quote
| Field Name | Type |
|------------|------|
| title | String |
| description | String |
| address | String |
| latitude | Double |
| longitude | Double |
| customerName | String |
| customerPhone | String |
| customerEmail | String |
| photoIds | String (JSON) |
| urgency | String |
| scopeNotes | String |
| status | String |
| quotedAmount | Double |
| quotedNotes | String |
| quotedAt | String |
| quotedBy | String |
| createdAt | Date/Time |
| updatedAt | Date/Time |

#### Photo
| Field Name | Type |
|------------|------|
| projectId | String |
| fileName | String |
| description | String |
| location | String |
| area | String |
| phase | String |
| costCode | String |
| tags | String (JSON) |
| imageAsset | Asset |
| createdBy | String |
| createdAt | Date/Time |

### 2.3 Add Indexes

For each record type, add these indexes for query performance:

1. Click on the record type
2. Click **Indexes** tab
3. Add index for `createdAt` (Queryable, Sortable)
4. Add index for `updatedAt` (Queryable, Sortable)
5. For Project, Delivery, Task, etc: Add index for `projectId` (Queryable)

### 2.4 Deploy Schema to Production

1. Click **Deploy Schema Changes...**
2. Review changes
3. Click **Deploy**

## Step 3: Install Capacitor CloudKit Plugin

Since there isn't an official Capacitor CloudKit plugin, we have two options:

### Option A: Use Native Swift Bridge (Recommended)

Create a native Swift plugin:

1. In Xcode, create a new Swift file: `CloudKitPlugin.swift`

```swift
import Foundation
import Capacitor
import CloudKit

@objc(CloudKitPlugin)
public class CloudKitPlugin: CAPPlugin {
    private let container = CKContainer(identifier: "iCloud.com.faithfulandtrue.officebridge")
    private var sharedDatabase: CKDatabase { container.sharedCloudDatabase }
    private var privateDatabase: CKDatabase { container.privateCloudDatabase }
    
    @objc func getAccountStatus(_ call: CAPPluginCall) {
        container.accountStatus { status, error in
            if let error = error {
                call.reject("Failed to get account status", nil, error)
                return
            }
            
            let statusString: String
            switch status {
            case .available:
                statusString = "available"
            case .noAccount:
                statusString = "noAccount"
            case .restricted:
                statusString = "restricted"
            default:
                statusString = "unknown"
            }
            
            call.resolve(["accountStatus": statusString])
        }
    }
    
    @objc func createRecordZone(_ call: CAPPluginCall) {
        guard let zoneName = call.getString("zoneName") else {
            call.reject("zoneName is required")
            return
        }
        
        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)
        let zone = CKRecordZone(zoneID: zoneID)
        
        let operation = CKModifyRecordZonesOperation(recordZonesToSave: [zone], recordZoneIDsToDelete: nil)
        operation.modifyRecordZonesResultBlock = { result in
            switch result {
            case .success:
                call.resolve(["zoneName": zoneName])
            case .failure(let error):
                call.reject("Failed to create zone", nil, error)
            }
        }
        
        sharedDatabase.add(operation)
    }
    
    @objc func saveRecord(_ call: CAPPluginCall) {
        guard let recordType = call.getString("recordType"),
              let recordName = call.getString("recordName"),
              let zoneName = call.getString("zoneName"),
              let fields = call.getObject("fields") else {
            call.reject("Missing required parameters")
            return
        }
        
        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)
        let recordID = CKRecord.ID(recordName: recordName, zoneID: zoneID)
        let record = CKRecord(recordType: recordType, recordID: recordID)
        
        for (key, value) in fields {
            if let dict = value as? [String: Any], let fieldValue = dict["value"] {
                record[key] = fieldValue as? CKRecordValue
            }
        }
        
        sharedDatabase.save(record) { savedRecord, error in
            if let error = error {
                call.reject("Failed to save record", nil, error)
                return
            }
            call.resolve(["recordName": savedRecord?.recordID.recordName ?? recordName])
        }
    }
    
    @objc func queryRecords(_ call: CAPPluginCall) {
        guard let recordType = call.getString("recordType"),
              let zoneName = call.getString("zoneName") else {
            call.reject("Missing required parameters")
            return
        }
        
        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)
        let predicate = NSPredicate(value: true)
        let query = CKQuery(recordType: recordType, predicate: predicate)
        
        sharedDatabase.fetch(withQuery: query, inZoneWith: zoneID) { result in
            switch result {
            case .success(let (matchResults, _)):
                var records: [[String: Any]] = []
                for (_, recordResult) in matchResults {
                    if case .success(let record) = recordResult {
                        var fields: [String: Any] = [:]
                        for key in record.allKeys() {
                            fields[key] = ["value": record[key] ?? NSNull()]
                        }
                        records.append([
                            "recordName": record.recordID.recordName,
                            "recordType": record.recordType,
                            "fields": fields
                        ])
                    }
                }
                call.resolve(["records": records])
            case .failure(let error):
                call.reject("Failed to query records", nil, error)
            }
        }
    }
    
    @objc func createShare(_ call: CAPPluginCall) {
        guard let recordName = call.getString("recordName"),
              let zoneName = call.getString("zoneName") else {
            call.reject("Missing required parameters")
            return
        }
        
        let zoneID = CKRecordZone.ID(zoneName: zoneName, ownerName: CKCurrentUserDefaultName)
        let recordID = CKRecord.ID(recordName: recordName, zoneID: zoneID)
        
        sharedDatabase.fetch(withRecordID: recordID) { record, error in
            guard let record = record else {
                call.reject("Record not found", nil, error)
                return
            }
            
            let share = CKShare(rootRecord: record)
            share.publicPermission = .readWrite
            
            let operation = CKModifyRecordsOperation(recordsToSave: [record, share], recordIDsToDelete: nil)
            operation.modifyRecordsResultBlock = { result in
                switch result {
                case .success:
                    if let url = share.url {
                        call.resolve(["shareUrl": url.absoluteString])
                    } else {
                        call.reject("No share URL returned")
                    }
                case .failure(let error):
                    call.reject("Failed to create share", nil, error)
                }
            }
            
            self.sharedDatabase.add(operation)
        }
    }
}
```

2. Register the plugin in `AppDelegate.swift`:

```swift
// Add to application(_:didFinishLaunchingWithOptions:)
let cloudKitPlugin = CloudKitPlugin()
bridge?.registerPluginInstance(cloudKitPlugin)
```

### Option B: Use Web-based CloudKit JS (Alternative)

For web/PWA testing, you can use CloudKit JS. Add to `index.html`:

```html
<script src="https://cdn.apple-cloudkit.com/ck/2/cloudkit.js"></script>
```

Then configure in your app:

```javascript
CloudKit.configure({
  containers: [{
    containerIdentifier: 'iCloud.com.faithfulandtrue.officebridge',
    apiTokenAuth: {
      apiToken: 'YOUR_API_TOKEN',
      persist: true
    },
    environment: 'development' // or 'production'
  }]
});
```

## Step 4: Test CloudKit

### 4.1 Test on Device

1. Build and run on a real iOS device (CloudKit requires real device)
2. Make sure you're signed into iCloud on the device
3. Go to Settings → Team Setup in the app
4. Create a new team
5. Try inviting another team member

### 4.2 Monitor in CloudKit Dashboard

1. Go to https://icloud.developer.apple.com/
2. Select your container
3. Click **Data** to see records
4. Click **Logs** to see API calls

## Step 5: App Store Preparation

### 5.1 Enable Production Environment

1. In CloudKit Dashboard, deploy schema to Production
2. In Xcode, ensure you're using the Production environment for release builds

### 5.2 Privacy Description

Add to Info.plist:
```xml
<key>NSUbiquityUsageDescription</key>
<string>Office Bridge uses iCloud to sync your data across devices and with your team.</string>
```

### 5.3 Test with TestFlight

1. Archive and upload to App Store Connect
2. Invite testers via TestFlight
3. Have them test team sharing functionality

## Troubleshooting

### "Account Status: No Account"
- User needs to sign into iCloud in device Settings

### "Permission Denied"
- Check that CloudKit capability is enabled in Xcode
- Verify container ID matches

### "Records Not Syncing"
- Check CloudKit Dashboard Logs for errors
- Verify schema is deployed to correct environment
- Check network connectivity

### "Share URL Not Working"
- Share must be created from the shared database
- Recipient must have iCloud account
- Share permissions must be set correctly

## Cost

CloudKit is **free** with these limits:
- 1 PB of asset storage
- 10 TB of database storage
- 400 MB/user/day transfer

For most construction apps, you'll never hit these limits.
