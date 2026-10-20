<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>
<qgis version="3.34.0" styleCategories="AllStyleCategories">
  <renderer-v2 type="RuleRenderer" symbollevels="0">
    <rules key="{aegis-root-rule}">
      <rule filter="&quot;integrity_status&quot; = 'VERIFIED_AUTHENTIC'" label="Verified Authentic GNSS" symbol="0" key="{auth-rule}"/>
      <rule filter="&quot;integrity_status&quot; = 'SPOOFING_SUSPECTED'" label="Spoofing Suspected" symbol="1" key="{susp-rule}"/>
      <rule filter="&quot;integrity_status&quot; = 'SPOOFING_DETECTED_MITIGATED'" label="Spoofing Confirmed &amp; Mitigated" symbol="2" key="{mitig-rule}"/>
    </rules>
    <symbols>
      <symbol type="marker" name="0" alpha="1" clip_to_extent="1">
        <layer class="SimpleMarker" locked="0" pass="0">
          <prop k="color" v="16,185,129,255"/>
          <prop k="size" v="3.5"/>
          <prop k="outline_color" v="255,255,255,255"/>
        </layer>
      </symbol>
      <symbol type="marker" name="1" alpha="1" clip_to_extent="1">
        <layer class="SimpleMarker" locked="0" pass="0">
          <prop k="color" v="245,158,11,255"/>
          <prop k="size" v="4.0"/>
          <prop k="name" v="triangle"/>
        </layer>
      </symbol>
      <symbol type="marker" name="2" alpha="1" clip_to_extent="1">
        <layer class="SimpleMarker" locked="0" pass="0">
          <prop k="color" v="239,68,68,255"/>
          <prop k="size" v="4.5"/>
          <prop k="name" v="diamond"/>
        </layer>
      </symbol>
    </symbols>
  </renderer-v2>
</qgis>
