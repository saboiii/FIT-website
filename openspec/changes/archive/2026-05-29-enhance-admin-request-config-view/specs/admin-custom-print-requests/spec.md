# Admin Custom Print Requests (delta for enhance-admin-request-config-view)

## ADDED Requirements

### Requirement: Inline expandable print configuration
The system SHALL let an admin/print-farm operator expand any custom print request
in the admin list to read its full print configuration inline — all print
settings, all mesh colours (labelled), and the model dimensions/weight — via an
explicit expand/collapse control, without entering edit mode and without leaving
the list. The configuration SHALL remain downloadable.

#### Scenario: Expand a request to read its configuration
- GIVEN the admin custom-print-requests list with a configured request
- WHEN the operator clicks the request's expand control
- THEN the full print configuration (settings + mesh colours + dimensions) is shown inline
- AND collapsing it hides the detail again

#### Scenario: Configuration is readable while editing is available
- GIVEN a request whose configuration is expanded
- WHEN the operator chooses to edit the request
- THEN the configuration remains readable (display is not lost by entering edit mode)

#### Scenario: Downloads remain available
- GIVEN an expanded request
- WHEN the operator chooses to download
- THEN both the print configuration and the model file can be downloaded
