import cs from 'classnames'
import _ from 'lodash'
import React, { Component } from 'react'
import { observer } from 'mobx-react'
import BootstrapModal from 'react-bootstrap-modal'

import state from '../lib/state'
import ipc from '../lib/ipc'
import { gravatarUrl } from '../lib/utils'
import orgsStore from '../organizations/organizations-store'
import { getOrgs, pollOrgs, stopPollingOrgs } from '../organizations/organizations-api'

@observer
class SetupProject extends Component {
  static propTypes = {
    project: React.PropTypes.object,
    onSetup: React.PropTypes.func.isRequired,
  }

  constructor (...args) {
    super(...args)

    this.state = {
      error: null,
      projectName: this._initialProjectName(),
      public: null,
      owner: null,
      orgId: null,
      showNameMissingError: false,
      isSubmitting: false,
    }
  }

  componentDidMount () {
    getOrgs()
    pollOrgs()
  }

  componentWillUnmount () {
    stopPollingOrgs()
  }

  render () {
    if (!orgsStore.isLoaded) return null

    return (
      <div className='setup-project-modal modal-body os-dialog'>
        <BootstrapModal.Dismiss className='btn btn-link close'>x</BootstrapModal.Dismiss>
        <h4>Setup Project</h4>
        <form
          onSubmit={this._submit}>
          {this._nameField()}
          <hr />
          {this._ownerSelector()}
          {this._accessSelector()}
          {this._error()}
          <div className='actions form-group'>
            <div className='pull-right'>
              <button
                disabled={this.state.isSubmitting || this._formNotFilled()}
                className='btn btn-primary btn-block'
              >
                {
                  this.state.isSubmitting ?
                    <span><i className='fa fa-spin fa-refresh'></i>{' '}</span> :
                    null
                }
                <span>Setup Project</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    )
  }

  _nameField () {
    return (
      <div className='form-group'>
        <div className='label-title'>
          <label htmlFor='projectName' className='control-label pull-left'>
            What's the name of the project?
          </label>
          <p className='help-block pull-right'>(You can change this later)</p>
        </div>
        <div>
          <input
            autoFocus='true'
            ref='projectName'
            type='text'
            className='form-control'
            id='projectName'
            value={this.state.projectName}
            onChange={this._updateProjectName}
          />
        </div>
        <div className='help-block validation-error'>Please enter a project name</div>
      </div>
    )
  }

  _ownerSelector () {
    return (
      <div className='form-group'>
        <div className='label-title'>
          <label htmlFor='projectName' className='control-label pull-left'>
            Who should own this project?
            {' '}
            <a onClick={this._openOrgDocs}>
              <i className='fa fa-question-circle'></i>
            </a>
          </label>
        </div>
        <div className='owner-parts'>
          <div>
            <div className='btn-group' data-toggle='buttons'>
              <label className={cs('btn btn-default', {
                'active': this.state.owner === 'me',
              })}>
                <input
                  type='radio'
                  name='owner-toggle'
                  id='me'
                  autoComplete='off'
                  value='me'
                  checked={this.state.owner === 'me'}
                  onChange={this._updateOwner}
                  />
                  <img
                    className='user-avatar'
                    height='13'
                    width='13'
                    src={`${gravatarUrl(state.user && state.user.email)}`}
                  />
                  {' '}Me
              </label>
              <label className={`btn btn-default ${this.state.owner === 'org' ? 'active' : ''}`}>
                <input
                  type='radio'
                  name='owner-toggle'
                  id='org'
                  autoComplete='off'
                  value='org'
                  checked={this.state.owner === 'org'}
                  onChange={this._updateOwner}
                  />
                  <i className='fa fa-building-o'></i>
                  {' '}An Organization
              </label>
            </div>
          </div>
          <div className='select-orgs'>
            <div className={cs({ 'hidden': this.state.owner !== 'org' || orgsStore.orgs.length })}>
              <div className='empty-select-orgs well'>
                <p>You don't have any organizations yet.</p>
                <p>Organizations can help you manage projects, including billing.</p>
                <p>
                  <a
                    href='#'
                    className={cs('btn btn-link', { 'hidden': this.state.owner !== 'org' })}
                    onClick={this._manageOrgs}>
                    <i className='fa fa-plus'></i>{' '}
                    Create Organization
                  </a>
                </p>
              </div>
            </div>
            {this._orgSelector()}
          </div>
        </div>
      </div>
    )
  }

  _orgSelector () {
    return (
      <div className={cs({ 'hidden': this.state.owner !== 'org' || !orgsStore.orgs.length })}>
        <select
          ref='orgId'
          id='organizations-select'
          className='form-control float-left'
          value={this.state.orgId || ''}
          onChange={this._updateOrgId}
          >
            <option value=''>-- Select Organization --</option>
            {_.map(orgsStore.orgs, (org) => {
              if (org.default) return null

              return (
                <option
                  key={org.id}
                  value={org.id}
                >
                  {org.name}
                </option>
              )
            })}
        </select>
        <a
          href='#'
          className='btn btn-link manage-orgs-btn float-left'
          onClick={this._manageOrgs}>
          (manage organizations)
        </a>
      </div>
    )
  }

  _accessSelector () {
    return (
      <div className={cs({ 'hidden': !this.state.orgId })}>
        <hr />
        <label htmlFor='projectName' className='control-label'>
          Who should see the runs and recordings?
          {' '}
          <a onClick={this._openAccessDocs}>
            <i className='fa fa-question-circle'></i>
          </a>
        </label>
        <div className='radio privacy-radio'>
          <label>
            <input
              type='radio'
              name='privacy-radio'
              value='true'
              checked={(this.state.public === true)}
              onChange={this._updateAccess}
            />
            <p>
              <i className='fa fa-eye'></i>{' '}
              <strong>Public:</strong>{' '}
              Anyone has access.
            </p>
          </label>
        </div>
        <div className='radio privacy-radio'>
          <label>
            <input
              type='radio'
              name='privacy-radio'
              value='false'
              checked={(this.state.public === false)}
              onChange={this._updateAccess}
            />
            <p>
              <i className='fa fa-lock'></i>{' '}
              <strong>Private:</strong>{' '}
              Only invited users have access.
              <br/>
              <small className='help-block'>(Free while in beta, but will require a paid account in the future)</small>
            </p>
          </label>
        </div>
      </div>
    )
  }

  _openOrgDocs = (e) => {
    e.preventDefault()
    App.ipc('external:open', 'https://on.cypress.io/what-are-organizations')
  }

  _openAccessDocs = (e) => {
    e.preventDefault()
    App.ipc('external:open', 'https://on.cypress.io/what-is-project-access')
  }

  _manageOrgs = (e) => {
    e.preventDefault()
    ipc.externalOpen('https://on.cypress.io/dashboard/organizations')
  }

  _formNotFilled () {
    return _.isNull(this.state.public) || !this.state.projectName
  }

  _initialProjectName = () => {
    let project = this.props.project

    if (project.name) {
      return project.name
    } else {
      let splitName = _.last(project.path.split('/'))
      return _.truncate(splitName, { length: 60 })
    }
  }

  _error () {
    const error = this.state.error
    if (!error) return null

    return (
      <div>
        <p className='text-danger'>An error occurred setting up your project:</p>
        <pre className='alert alert-danger'>{error.message}</pre>
      </div>
    )
  }

  _updateOrgId = () => {
    const orgIsNotSelected = this.refs.orgId.value === '-- Select Organization --'

    const orgId = orgIsNotSelected ? null : this.refs.orgId.value

    this.setState({
      orgId,
    })

    // deselect their choice for access
    // if they didn'tselect anything
    if (orgIsNotSelected) {
      this.setState({
        public: null,
      })
    }
  }

  _updateProjectName = () => {
    this.setState({
      projectName: this.refs.projectName.value,
    })
  }

  _hasValidProjectName () {
    return _.trim(this.state.projectName)
  }

  _updateOwner = (e) => {
    let owner = e.target.value

    // if they clicked the same radio button that's
    // already selected, then ignore it
    if (this.state.owner === owner) return

    const defaultOrg = _.find(orgsStore.orgs, { default: true })

    let chosenOrgId = owner === 'me' ? defaultOrg.id : null

    // we want to clear all selects below the radio buttons
    // otherwise it looks jarring to already have selects
    this.setState({
      owner,
      orgId: chosenOrgId,
      public: null,
    })
  }

  _updateAccess = (e) => {
    this.setState({
      public: e.target.value === 'true',
    })
  }

  _submit = (e) => {
    e.preventDefault()

    if (this.state.isSubmitting) return

    if (this._hasValidProjectName()) {
      this.setState({
        isSubmitting: true,
      })
      this._setupProject()
    } else {
      this.setState({
        showNameMissingError: true,
      })
    }
  }

  _setupProject () {
    ipc.setupDashboardProject({
      projectName: this.state.projectName,
      orgId: this.state.orgId,
      public: this.state.public,
    })
    .then((projectDetails) => {
      this.setState({
        isSubmitting: false,
      })
      this.props.onSetup(projectDetails)
      return null
    })
    .catch(ipc.isUnauthed, ipc.handleUnauthed)
    .catch((error) => {
      this.setState({
        error,
        isSubmitting: false,
      })
    })
  }
}

export default SetupProject