# Custom Print Requests (delta for fix-model-download-filename)

## ADDED Requirements

### Requirement: Model downloads preserve the original filename and extension
The system SHALL serve downloaded model files named with the user's original
filename and correct extension (from `modelFile.originalName`), regardless of how
the download is initiated, by always setting `Content-Disposition: attachment`
with a sanitised filename. A served filename SHALL never be the route name
("proxy") and SHALL never lack an extension.

#### Scenario: Download uses the original filename
- GIVEN a request whose `modelFile.originalName` is "bracket.stl"
- WHEN an operator downloads the model
- THEN the downloaded file is named "bracket.stl"

#### Scenario: Fallback still has an extension
- GIVEN a request whose original filename is missing but whose S3 key indicates an STL
- WHEN the model is downloaded
- THEN the file is named with a sensible name ending in the correct extension (not "proxy", not extension-less)

#### Scenario: Filename input is sanitised
- GIVEN a download requested with a filename containing path separators or
  control/header characters
- WHEN the server builds the Content-Disposition header
- THEN those characters are stripped/escaped so no header injection or path traversal occurs
